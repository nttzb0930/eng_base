import { ToeicWritingSubmissionView } from "@/app/views/toeic-writing/ToeicWritingSubmissionView";

type ToeicWritingSubmissionPageProps = {
  params: Promise<{ submissionId: string }>;
};

export default async function ToeicWritingSubmissionPage({
  params,
}: ToeicWritingSubmissionPageProps) {
  const { submissionId } = await params;
  return <ToeicWritingSubmissionView submissionId={Number(submissionId)} />;
}
