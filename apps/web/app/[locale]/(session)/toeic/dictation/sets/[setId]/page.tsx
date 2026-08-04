import { ToeicDictationSessionView } from "@/app/views/toeic-listening/ToeicDictationSessionView";

type Props = { params: Promise<{ setId: string }>; searchParams: Promise<{ practice?: string | string[] }> };

export default async function ToeicDictationSessionPage({ params, searchParams }: Props) {
  const { setId } = await params;
  const query = await searchParams;
  const practice = Array.isArray(query.practice) ? query.practice[0] : query.practice;
  const mode = practice === "check" || practice === "full" ? practice : "dictation";
  return <ToeicDictationSessionView setId={Number(setId)} mode={mode} />;
}
