import assert from "node:assert/strict";
import test from "node:test";

import {
  createCourseManagementClient,
  type CourseManagementHttpClient,
} from "../api/course-management.client";

type Client = ReturnType<typeof createCourseManagementClient>;
type Request = {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, unknown>;
};

function createHttpStub(responseData: unknown) {
  const requests: Request[] = [];
  const response = { success: true, data: responseData };

  const http: CourseManagementHttpClient = {
    async get<T>(path: string, options?: { params?: Record<string, unknown> }) {
      requests.push({ method: "GET", path, params: options?.params });
      return response as { success: true; data: T };
    },
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return response as { success: true; data: T };
    },
    async put<T>(path: string, body?: unknown) {
      requests.push({ method: "PUT", path, body });
      return response as { success: true; data: T };
    },
    async delete<T>(path: string) {
      requests.push({ method: "DELETE", path });
      return { success: true } as { success: true; data?: T };
    },
  };

  return { http, requests };
}

const resourceCases: Array<{
  name: string;
  collectionPath: string;
  memberPath: string;
  response: unknown;
  createBody: unknown;
  updateBody: unknown;
  run(client: Client): Promise<void>;
}> = [
  {
    name: "courses",
    collectionPath: "/admin/courses",
    memberPath: "/admin/courses/7",
    response: { id: 7, title: "English", imageSrc: "/en.svg" },
    createBody: { title: "English", imageSrc: "/en.svg" },
    updateBody: { title: "English A1" },
    async run(client) {
      await client.courses.create(
        this.createBody as { title: string; imageSrc: string }
      );
      await client.courses.update(7, this.updateBody as { title: string });
      await client.courses.remove(7);
    },
  },
  {
    name: "units",
    collectionPath: "/admin/units",
    memberPath: "/admin/units/7",
    response: {
      id: 7,
      title: "Basics",
      description: "A1",
      courseId: 1,
      order: 1,
    },
    createBody: { title: "Basics", description: "A1", courseId: 1, order: 1 },
    updateBody: { order: 2 },
    async run(client) {
      await client.units.create(
        this.createBody as {
          title: string;
          description: string;
          courseId: number;
          order: number;
        }
      );
      await client.units.update(7, this.updateBody as { order: number });
      await client.units.remove(7);
    },
  },
  {
    name: "lessons",
    collectionPath: "/admin/lessons",
    memberPath: "/admin/lessons/7",
    response: { id: 7, title: "Animals", unitId: 2, order: 1 },
    createBody: { title: "Animals", unitId: 2, order: 1 },
    updateBody: { title: "Wild animals" },
    async run(client) {
      await client.lessons.create(
        this.createBody as { title: string; unitId: number; order: number }
      );
      await client.lessons.update(7, this.updateBody as { title: string });
      await client.lessons.remove(7);
    },
  },
  {
    name: "challenges",
    collectionPath: "/admin/challenges",
    memberPath: "/admin/challenges/7",
    response: {
      id: 7,
      lessonId: 2,
      type: "SELECT",
      direction: "EN_TO_VI",
      question: "Bear?",
      order: 1,
      vocabularyItemId: 9,
    },
    createBody: {
      lessonId: 2,
      type: "SELECT",
      direction: "EN_TO_VI",
      question: "Bear?",
      order: 1,
      vocabularyItemId: 9,
    },
    updateBody: { direction: null },
    async run(client) {
      await client.challenges.create(
        this.createBody as {
          lessonId: number;
          type: "SELECT";
          direction: "EN_TO_VI";
          question: string;
          order: number;
          vocabularyItemId: number;
        }
      );
      await client.challenges.update(7, this.updateBody as { direction: null });
      await client.challenges.remove(7);
    },
  },
  {
    name: "challenge options",
    collectionPath: "/admin/challengeOptions",
    memberPath: "/admin/challengeOptions/7",
    response: {
      id: 7,
      challengeId: 3,
      text: "Bear",
      correct: true,
      imageSrc: null,
      audioSrc: null,
    },
    createBody: {
      challengeId: 3,
      text: "Bear",
      correct: true,
      imageSrc: null,
      audioSrc: null,
    },
    updateBody: { correct: false },
    async run(client) {
      await client.challengeOptions.create(
        this.createBody as {
          challengeId: number;
          text: string;
          correct: boolean;
          imageSrc: null;
          audioSrc: null;
        }
      );
      await client.challengeOptions.update(
        7,
        this.updateBody as { correct: boolean }
      );
      await client.challengeOptions.remove(7);
    },
  },
];

for (const resource of resourceCases) {
  test(`course management client preserves ${resource.name} CRUD routes`, async () => {
    const { http, requests } = createHttpStub(resource.response);
    await resource.run(createCourseManagementClient(http));

    assert.deepEqual(requests, [
      {
        method: "POST",
        path: resource.collectionPath,
        body: resource.createBody,
      },
      { method: "PUT", path: resource.memberPath, body: resource.updateBody },
      { method: "DELETE", path: resource.memberPath },
    ]);
  });
}

test("listPage sends pagination params and parses the pagination envelope", async () => {
  const { http, requests } = createHttpStub({
    data: [{ id: 7, title: "English", imageSrc: "/en.svg" }],
    pagination: {
      total: 1,
      page: 2,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: true,
    },
  });
  const client = createCourseManagementClient(http);

  const result = await client.courses.listPage({
    page: 2,
    limit: 20,
    search: "eng",
  });

  assert.equal(result.data[0]?.title, "English");
  assert.deepEqual(requests, [
    {
      method: "GET",
      path: "/admin/courses",
      params: { page: 2, limit: 20, search: "eng" },
    },
  ]);
});

test("listAll keeps the raw-array lookup capability separate", async () => {
  const { http, requests } = createHttpStub([
    { id: 3, title: "Animals", unitId: 2, order: 1 },
  ]);
  const client = createCourseManagementClient(http);

  const result = await client.lessons.listAll();

  assert.equal(result[0]?.title, "Animals");
  assert.deepEqual(requests, [
    {
      method: "GET",
      path: "/admin/lessons",
      params: undefined,
    },
  ]);
});

test("course management client rejects persistence-shaped responses", async () => {
  const { http } = createHttpStub({
    id: 7,
    title: "English Vocabulary",
    image_src: "/en.svg",
  });
  const client = createCourseManagementClient(http);

  await assert.rejects(() =>
    client.courses.create({
      title: "English Vocabulary",
      imageSrc: "/en.svg",
    })
  );
});
