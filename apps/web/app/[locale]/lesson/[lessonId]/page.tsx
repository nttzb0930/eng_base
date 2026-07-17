import { LessonView } from "@/app/views/lessons/LessonView";

type LessonByIdPageProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

export default async function LessonByIdPage({ params }: LessonByIdPageProps) {
  const { lessonId } = await params;

  return <LessonView lessonId={Number(lessonId)} />;
}
