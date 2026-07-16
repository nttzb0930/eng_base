import { getNextQuestion } from "@/src/modules/placement-test";
import PlacementTestView from "@/src/views/placement-test/PlacementTestView";
import { AuthRedirector } from "@/src/components/auth-redirector";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale } from "@/src/lib/i18n/config";
import { withLocale } from "@/src/lib/i18n/paths";

const PlacementTestPage = async () => {
  const currentLocale = await getLocale();
  const locale = isLocale(currentLocale) ? currentLocale : defaultLocale;

  // Nạp câu hỏi hoặc kết quả đầu tiên từ backend
  let initialData;
  try {
    initialData = await getNextQuestion();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized") || message.includes("TOKEN_INVALID")) {
      return <AuthRedirector locale={locale} />;
    }
    console.error("Lỗi lấy thông tin bài test đầu vào:", error);
    initialData = null;
  }

  // Nếu đã xác nhận trình độ rồi → vào learn luôn
  if (initialData?.status === "CONFIRMED") {
    redirect(withLocale("/learn", locale));
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-neutral-50">
      <PlacementTestView initialData={initialData} />
    </div>
  );
};

export default PlacementTestPage;
