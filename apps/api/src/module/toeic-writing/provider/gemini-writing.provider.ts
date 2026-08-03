import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";

import type { GeminiConfiguration } from "../../../config";
import {
  buildPartTwoGradingPrompt,
  PART_TWO_GRADING_SYSTEM_INSTRUCTION,
} from "./part-two-grading.prompt";
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
  ): Promise<{ text?: string }>;
}

export class WritingAiInvalidResponseError extends Error {
  constructor() {
    super("Writing AI returned an invalid structured response");
    this.name = "WritingAiInvalidResponseError";
  }
}

export function createGeminiWritingClient(apiKey: string): GeminiWritingClient {
  const client = new GoogleGenAI({ apiKey });
  return {
    async generateContent(request) {
      const response = await client.models.generateContent(request);
      return { text: response.text };
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
  text: string | undefined,
  schema: z.ZodType<T>
): T {
  try {
    return schema.parse(JSON.parse(text ?? ""));
  } catch {
    throw new WritingAiInvalidResponseError();
  }
}

export class GeminiWritingProvider implements WritingAiProvider {
  constructor(
    private readonly client: GeminiWritingClient,
    private readonly configuration: GeminiConfiguration
  ) {}

  enrichPicture(input: Parameters<WritingAiProvider["enrichPicture"]>[0]) {
    const prompt = [
      "Describe only what is visibly supported by this TOEIC Writing picture.",
      `Required words: ${input.requiredWords.join(", ")}.`,
      "Return the requested JSON schema. Do not infer hidden facts.",
    ].join("\n");

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
    const first = await this.generateWithTimeout(request);
    try {
      return parseStructuredResponse(first.text, schema);
    } catch (error) {
      if (!(error instanceof WritingAiInvalidResponseError)) throw error;
    }

    const repairInstruction =
      "The previous output failed validation. Return only valid JSON matching the response schema.";
    const currentSystemInstruction = request.config?.systemInstruction;
    const repaired = await this.generateWithTimeout({
      ...request,
      config: {
        ...request.config,
        systemInstruction:
          typeof currentSystemInstruction === "string"
            ? `${currentSystemInstruction}\n\n${repairInstruction}`
            : repairInstruction,
      },
    });
    return parseStructuredResponse(repaired.text, schema);
  }

  private async generateWithTimeout(
    request: GenerateContentParameters
  ): Promise<{ text?: string }> {
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
