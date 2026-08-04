import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";

import type { GeminiConfiguration } from "../../../config";
import {
  buildPartTwoGradingPrompt,
  PART_TWO_GRADING_SYSTEM_INSTRUCTION,
} from "./part-two-grading.prompt";
import { buildPictureEnrichmentPrompt } from "./picture-enrichment.prompt";
import {
  writingPartOneProviderResultSchema,
  writingPartTwoProviderResultSchema,
  writingPictureContextSchema,
} from "./writing-ai.schemas";
import type {
  WritingAiProvider,
  WritingPartOneProviderResult,
  WritingPartTwoProviderResult,
} from "./writing-ai-provider";

export interface GeminiWritingClient {
  generateContent(
    request: GenerateContentParameters
  ): Promise<{ text?: string; structured?: unknown }>;
}

export class WritingAiInvalidResponseError extends Error {
  constructor(reason = "unknown validation failure") {
    super(`Writing AI returned an invalid structured response: ${reason}`);
    this.name = "WritingAiInvalidResponseError";
  }
}

export function buildGeminiClientOptions(
  apiKey: string,
  apiEndpoint = ""
): ConstructorParameters<typeof GoogleGenAI>[0] {
  const endpoint = apiEndpoint.trim();
  return endpoint
    ? { apiKey, httpOptions: { baseUrl: endpoint } }
    : { apiKey };
}

export function createGeminiWritingClient(
  apiKey: string,
  apiEndpoint = ""
): GeminiWritingClient {
  const client = new GoogleGenAI(buildGeminiClientOptions(apiKey, apiEndpoint));
  return {
    async generateContent(request) {
      const response = await client.models.generateContent(request);
      const functionCalls = response.functionCalls;
      const text = functionCalls?.length ? undefined : response.text;
      const structured = functionCalls?.[0]?.args;
      return structured === undefined
        ? { text }
        : { structured };
    },
  };
}

function inlineImagePart(
  imageBytes: Uint8Array,
  mimeType: string
): { inlineData: { data: string; mimeType: string } } {
  return {
    inlineData: {
      data: Buffer.from(imageBytes).toString("base64"),
      mimeType,
    },
  };
}

function parseStructuredResponse<T>(
  response: { text?: string; structured?: unknown },
  schema: z.ZodType<T>
): T {
  try {
    const value =
      response.structured === undefined
        ? JSON.parse(stripJsonFences(response.text ?? ""))
        : response.structured;
    return schema.parse(value);
  } catch (error) {
    const reason = error instanceof z.ZodError
      ? error.issues.slice(0, 3).map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ")
      : "response was not valid JSON";
    throw new WritingAiInvalidResponseError(reason);
  }
}

function stripJsonFences(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
  return (fenced?.[1] ?? trimmed).trim();
}

export class GeminiWritingProvider implements WritingAiProvider {
  constructor(
    private readonly client: GeminiWritingClient,
    private readonly configuration: GeminiConfiguration
  ) {}

  enrichPicture(input: Parameters<WritingAiProvider["enrichPicture"]>[0]) {
    const prompt = buildPictureEnrichmentPrompt(input.requiredWords);

    return this.generateStructured(
      {
        model: this.configuration.visionModel,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              inlineImagePart(input.imageBytes, input.mimeType),
            ],
          },
        ],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(writingPictureContextSchema),
        },
      },
      writingPictureContextSchema
    );
  }

  gradePartOne(
    input: Parameters<WritingAiProvider["gradePartOne"]>[0]
  ): Promise<WritingPartOneProviderResult> {
    const prompt = [
      "Grade one TOEIC Writing picture-description sentence from 0 to 3.",
      `Feedback locale: ${input.locale}.`,
      `Learner response: ${JSON.stringify(input.responseText)}.`,
      `Required words: ${input.requiredWords.join(", ")}.`,
      input.picture.source === "ENRICHED"
        ? `Verified picture context: ${JSON.stringify(input.picture.context)}.`
        : "Use the attached owned picture to judge relevance.",
      "Judge grammar, required keywords, and picture relevance independently.",
      "Return only the requested JSON schema.",
    ].join("\n");
    const parts: Array<
      { text: string } | { inlineData: { data: string; mimeType: string } }
    > = [{ text: prompt }];
    if (input.picture.source === "DIRECT_IMAGE") {
      parts.push(
        inlineImagePart(input.picture.imageBytes, input.picture.mimeType)
      );
    }

    return this.generateStructured(
      {
        model: this.configuration.gradingModel,
        contents: [{ role: "user", parts }],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(
            writingPartOneProviderResultSchema
          ),
        },
      },
      writingPartOneProviderResultSchema
    );
  }

  async gradePartTwo(
    input: Parameters<WritingAiProvider["gradePartTwo"]>[0]
  ): Promise<WritingPartTwoProviderResult> {
    const result = await this.generateStructured(
      {
        model: this.configuration.gradingModel,
        contents: [
          {
            role: "user",
            parts: [{ text: buildPartTwoGradingPrompt(input) }],
          },
        ],
        config: {
          systemInstruction: PART_TWO_GRADING_SYSTEM_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(
            writingPartTwoProviderResultSchema
          ),
        },
      },
      writingPartTwoProviderResultSchema
    );
    const requirementIds = new Set(
      input.requirements.map((requirement) => requirement.id)
    );
    const returnedIds = [
      ...result.taskCompletion.requirements.map(
        (requirement) => requirement.requirementId
      ),
      ...result.improvedEmail.requirementCoverage.map(
        (requirement) => requirement.requirementId
      ),
    ];
    if (returnedIds.some((id) => !requirementIds.has(id))) {
      throw new WritingAiInvalidResponseError();
    }

    return result;
  }

  private async generateStructured<T>(
    request: GenerateContentParameters,
    schema: z.ZodType<T>
  ): Promise<T> {
    const schemaInstruction = [
      "Return only one JSON object that exactly matches this JSON schema.",
      "Do not use Markdown fences and do not rename, omit, or add fields.",
      JSON.stringify(z.toJSONSchema(schema)),
    ].join("\n");
    const currentSystemInstruction = request.config?.systemInstruction;
    const requestWithSchema: GenerateContentParameters = {
      ...request,
      config: {
        ...request.config,
        systemInstruction:
          typeof currentSystemInstruction === "string"
            ? `${currentSystemInstruction}\n\n${schemaInstruction}`
            : schemaInstruction,
      },
    };
    const first = await this.generateWithTimeout(requestWithSchema);
    try {
      return parseStructuredResponse(first, schema);
    } catch (error) {
      if (!(error instanceof WritingAiInvalidResponseError)) throw error;
    }

    const repairInstruction =
      "The previous output failed validation. Return only valid JSON matching the response schema.";
    const repaired = await this.generateWithTimeout({
      ...requestWithSchema,
      config: {
        ...requestWithSchema.config,
        systemInstruction: `${requestWithSchema.config?.systemInstruction ?? ""}\n\n${repairInstruction}`,
      },
    });
    return parseStructuredResponse(repaired, schema);
  }

  private async generateWithTimeout(
    request: GenerateContentParameters
  ): Promise<{ text?: string; structured?: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.configuration.timeoutMs
    );

    try {
      return await this.client.generateContent({
        ...request,
        config: { ...request.config, abortSignal: controller.signal },
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
