import assert from "node:assert/strict";
import test from "node:test";

import { createChallengeOptionApi } from "../api/challenge-option.api";
import { createChallengeApi } from "../api/challenge.api";
import { createCourseApi } from "../api/course.api";
import type { CourseManagementHttp } from "../api/course-management.http";
import { createLessonApi } from "../api/lesson.api";
import { createUnitApi } from "../api/unit.api";

type Request = {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, unknown>;
};

function createHttpStub(responseData: unknown) {
  const requests: Request[] = [];
  const response = { success: true, data: responseData };

  const http: CourseManagementHttp = {
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

const cases = [
  {
    name: "courses",
    path: "/admin/courses",
    response: { id: 7, title: "English", imageSrc: "/en.svg" },
    createBody: { title: "English", imageSrc: "/en.svg" },
    updateBody: { title: "English A1" },
    createApi: createCourseApi,
  },
  {
    name: "units",
    path: "/admin/units",
    response: {
      id: 7,
      title: "Basics",
      description: "A1",
      courseId: 1,
      order: 1,
    },
    createBody: { title: "Basics", description: "A1", courseId: 1, order: 1 },
    updateBody: { order: 2 },
    createApi: createUnitApi,
  },
  {
    name: "lessons",
    path: "/admin/lessons",
    response: { id: 7, title: "Animals", unitId: 2, order: 1 },
    createBody: { title: "Animals", unitId: 2, order: 1 },
    updateBody: { title: "Wild animals" },
    createApi: createLessonApi,
  },
  {
    name: "challenges",
    path: "/admin/challenges",
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
    createApi: createChallengeApi,
  },
  {
    name: "challenge options",
    path: "/admin/challengeOptions",
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
    createApi: createChallengeOptionApi,
  },
] as const;

for (const resource of cases) {
  test(`${resource.name} resource module preserves CRUD routes`, async () => {
    const { http, requests } = createHttpStub(resource.response);
    const api = resource.createApi(http) as {
      create(body: unknown): Promise<unknown>;
      update(id: number, body: unknown): Promise<unknown>;
      remove(id: number): Promise<void>;
    };

    await api.create(resource.createBody);
    await api.update(7, resource.updateBody);
    await api.remove(7);

    assert.deepEqual(requests, [
      { method: "POST", path: resource.path, body: resource.createBody },
      { method: "PUT", path: `${resource.path}/7`, body: resource.updateBody },
      { method: "DELETE", path: `${resource.path}/7` },
    ]);
  });
}

test("course resource separates paged and raw-list capabilities", async () => {
  const paged = createHttpStub({
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
  const pagedApi = createCourseApi(paged.http);
  await pagedApi.listPage({ page: 2, limit: 20, search: "eng" });

  assert.deepEqual(paged.requests, [
    {
      method: "GET",
      path: "/admin/courses",
      params: { page: 2, limit: 20, search: "eng" },
    },
  ]);

  const raw = createHttpStub([
    { id: 7, title: "English", imageSrc: "/en.svg" },
  ]);
  assert.equal(
    (await createCourseApi(raw.http).listAll())[0]?.title,
    "English"
  );
});

test("course resource returns its typed wire response unchanged", async () => {
  const course = { id: 7, title: "English", imageSrc: "/en.svg" };
  const { http } = createHttpStub(course);

  assert.deepEqual(
    await createCourseApi(http).create({
      title: "English",
      imageSrc: "/en.svg",
    }),
    course
  );
});
