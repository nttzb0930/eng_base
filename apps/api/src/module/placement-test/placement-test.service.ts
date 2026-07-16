import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma/prisma.service";
import { auth } from "../auth";
import { PlacementTestResponse, SubmitAnswerResponse } from "@repo/shared";
import { Prisma } from "@prisma/client";

@Injectable()
export class PlacementTestService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Lấy câu hỏi tiếp theo cho bài Placement Test thích ứng
   */
  async getNextQuestion(): Promise<PlacementTestResponse> {
    const { userId } = await auth();
    if (!userId) throw new BadRequestException("Unauthorized");

    // 1. Tìm hoặc tạo session
    let session = await this.prisma.placement_test_sessions.findUnique({
      where: { user_id: userId },
    });

    if (!session) {
      session = await this.prisma.placement_test_sessions.create({
        data: {
          user_id: userId,
          current_theta: 2.0, // Bắt đầu ở A2 (2.0)
          answered_count: 0,
          theta_history: [],
          used_word_ids: [],
          status: "IN_PROGRESS",
          buffer_options: [],
        },
      });
    }

    // Nếu đã hoàn thành bài test nhưng chưa xác nhận cấp độ
    if (session.status === "COMPLETED") {
      return {
        status: "COMPLETED",
        finalScore: session.final_score!,
        recommendedLevel: session.recommended_level!,
        inBufferZone: session.buffer_options.length > 0,
        bufferOptions: session.buffer_options,
      };
    }

    if (session.status === "CONFIRMED") {
      return {
        status: "CONFIRMED",
        confirmedLevel: session.confirmed_level!,
      };
    }

    if (session.answered_count >= 15) {
      // Đánh dấu hoàn thành nếu answered_count bằng hoặc lớn hơn 15
      await this.prisma.placement_test_sessions.update({
        where: { user_id: userId },
        data: { status: "COMPLETED" },
      });
      return {
        status: "COMPLETED",
        finalScore: session.final_score!,
        recommendedLevel: session.recommended_level!,
        inBufferZone: session.buffer_options.length > 0,
        bufferOptions: session.buffer_options,
      };
    }

    // 2. Xác định loại câu hỏi theo giai đoạn
    const currentQuestionNumber = session.answered_count + 1;
    let type: "SELECT" | "ASSIST" = "SELECT";
    // Do dự án chỉ có enum type = SELECT | ASSIST
    // Đối với Giai đoạn 3 (câu 11-15): vì hệ thống chưa định nghĩa dạng FILL_BLANK trong enum `type` ở schema
    // Chúng ta sẽ dùng SELECT với hướng EN_TO_VI hoặc linh động theo cấu trúc seed
    if (currentQuestionNumber > 10) {
      type = "SELECT"; // Fallback sang SELECT (EN_TO_VI) vì database không có enum FILL_BLANK
    } else if (currentQuestionNumber > 5) {
      type = "ASSIST";
    } else {
      type = "SELECT";
    }

    const roundedLevelScore = Math.floor(session.current_theta + 0.5);
    const cefrLevels = ["A1", "A2", "B1", "B2"];
    const targetIndex = Math.max(0, Math.min(3, roundedLevelScore - 1));

    // Khử trùng các cấp độ thử nghiệm fallback
    const levelFallbacks = [...new Set([
      cefrLevels[targetIndex],
      cefrLevels[Math.max(0, targetIndex - 1)],
      cefrLevels[Math.min(3, targetIndex + 1)],
      ...cefrLevels.filter((_, idx) => Math.abs(idx - targetIndex) > 1),
    ])];

    let challenge = null;

    for (const level of levelFallbacks) {
      const whereClause = {
        type: type,
        vocabulary_items: {
          cefr_level: level,
          id: { notIn: session.used_word_ids },
        },
      };

      const count = await this.prisma.challenges.count({ where: whereClause });

      if (count > 0) {
        const randomOffset = Math.floor(Math.random() * count);
        challenge = await this.prisma.challenges.findFirst({
          where: whereClause,
          skip: randomOffset,
          include: {
            challenge_options: true,
            vocabulary_items: true,
          },
        });

        if (challenge) {
          if (level !== cefrLevels[targetIndex]) {
            console.warn(
              `[Placement Test Fallback] User ${userId} requested Level ${cefrLevels[targetIndex]} but fell back to ${level} due to lack of questions.`
            );
          }
          break;
        }
      }
    }

    if (!challenge) {
      throw new NotFoundException("PLACEMENT_TEST_NO_QUESTIONS");
    }

    return {
      status: "IN_PROGRESS",
      questionNumber: currentQuestionNumber,
      onboardingStep: session.onboarding_step,
      onboardingData: session.onboarding_data ?? undefined,
      challenge: {
        id: challenge.id,
        direction: challenge.direction,
        question: challenge.question,
        word: challenge.vocabulary_items?.word ?? null,
        primaryMeaningVi:
          challenge.vocabulary_items?.primary_meaning_vi ?? null,
        options: challenge.challenge_options.map((opt) => ({ id: opt.id, text: opt.text })),
        audioUrl: challenge.vocabulary_items?.audio_url || null,
      },
    };
  }

  /**
   * Submit câu trả lời của người dùng
   */
  async submitAnswer(challengeId: number, selectedOptionId: number): Promise<SubmitAnswerResponse> {
    const { userId } = await auth();
    if (!userId) throw new BadRequestException("Unauthorized");

    const session = await this.prisma.placement_test_sessions.findUnique({
      where: { user_id: userId },
    });

    if (!session || session.status !== "IN_PROGRESS") {
      throw new BadRequestException("SESSION_NOT_RUNNING");
    }

    // 1. [BẢO MẬT] Kiểm tra selectedOptionId có thuộc về challengeId không
    const selectedOption = await this.prisma.challenge_options.findUnique({
      where: { id: selectedOptionId },
    });

    if (!selectedOption || selectedOption.challenge_id !== challengeId) {
      throw new BadRequestException("INVALID_OPTION");
    }

    const isCorrect = selectedOption.correct;

    // 2. Kích thước bước nhảy theo giai đoạn
    const currentQuestionNumber = session.answered_count + 1;
    let stepSize = 0.8;
    if (currentQuestionNumber > 10) {
      stepSize = 0.2;
    } else if (currentQuestionNumber > 5) {
      stepSize = 0.4;
    }

    // 3. Cập nhật theta
    let nextTheta = isCorrect
      ? session.current_theta + stepSize
      : session.current_theta - stepSize;

    // Chặn trong khoảng [1.0, 4.0]
    nextTheta = Math.max(1.0, Math.min(4.0, nextTheta));

    // 4. Lấy từ vựng ID để đánh dấu đã làm
    const challenge = await this.prisma.challenges.findUnique({
      where: { id: challengeId },
      select: { vocabulary_item_id: true },
    });

    const updatedUsedWordIds = [...session.used_word_ids];
    if (challenge?.vocabulary_item_id) {
      updatedUsedWordIds.push(challenge.vocabulary_item_id);
    }

    const updatedThetaHistory = [...session.theta_history, nextTheta];
    const newAnsweredCount = session.answered_count + 1;

    // 5. Nếu đạt câu thứ 15, kết luận điểm
    if (newAnsweredCount === 15) {
      const last5Thetas = updatedThetaHistory.slice(10, 15);
      const finalScore = last5Thetas.reduce((a, b) => a + b, 0) / 5;

      let inBufferZone = false;
      let bufferOptions: string[] = [];

      if (finalScore >= 1.35 && finalScore <= 1.65) {
        inBufferZone = true;
        bufferOptions = ["A1", "A2"];
      } else if (finalScore >= 2.35 && finalScore <= 2.65) {
        inBufferZone = true;
        bufferOptions = ["A2", "B1"];
      } else if (finalScore >= 3.35 && finalScore <= 3.65) {
        inBufferZone = true;
        bufferOptions = ["B1", "B2"];
      }

      let recommendedLevel = "A1";
      if (!inBufferZone) {
        if (finalScore >= 3.5) recommendedLevel = "B2";
        else if (finalScore >= 2.5) recommendedLevel = "B1";
        else if (finalScore >= 1.5) recommendedLevel = "A2";
      }

      await this.prisma.placement_test_sessions.update({
        where: { user_id: userId },
        data: {
          current_theta: nextTheta,
          answered_count: newAnsweredCount,
          theta_history: updatedThetaHistory,
          used_word_ids: updatedUsedWordIds,
          status: "COMPLETED",
          final_score: finalScore,
          recommended_level: recommendedLevel,
          buffer_options: bufferOptions,
        },
      });

      return {
        status: "COMPLETED",
        isCorrect,
        finalScore,
        inBufferZone,
        bufferOptions,
        recommendedLevel,
      };
    }

    // Cập nhật session thông thường
    await this.prisma.placement_test_sessions.update({
      where: { user_id: userId },
      data: {
        current_theta: nextTheta,
        answered_count: newAnsweredCount,
        theta_history: updatedThetaHistory,
        used_word_ids: updatedUsedWordIds,
      },
    });

    return {
      status: "IN_PROGRESS",
      isCorrect,
    };
  }

  /**
   * Xác nhận cấp độ bắt đầu học
   */
  async confirmLevel(level: string, languages?: string[], goals?: string[], intensity?: string, primaryLanguage?: string, customGoal?: string) {
    const { userId } = await auth();
    if (!userId) throw new BadRequestException("Unauthorized");

    const session = await this.prisma.placement_test_sessions.findUnique({
      where: { user_id: userId },
    });

    if (!session || session.status !== "COMPLETED") {
      if (level !== "A1") {
        throw new BadRequestException("SESSION_NOT_COMPLETED");
      }
    }

    const validLevels = ["A1", "A2", "B1", "B2"];
    if (!validLevels.includes(level)) {
      throw new BadRequestException("INVALID_LEVEL");
    }

    // 1. Lưu cấp độ lựa chọn vào session DB (sử dụng upsert để hỗ trợ trường hợp chưa có session)
    await this.prisma.placement_test_sessions.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        status: "CONFIRMED",
        confirmed_level: level,
        onboarding_step: 1,
        onboarding_data: Prisma.DbNull,
      },
      update: {
        status: "CONFIRMED",
        confirmed_level: level,
        onboarding_step: 1,
        onboarding_data: Prisma.DbNull,
      },
    });

    // 2. Thực hiện cập nhật user_progress học tập chính
    // Tìm course mặc định "English Vocabulary"
    const defaultCourse = await this.prisma.courses.findFirst({
      where: { title: "English Vocabulary" },
    });
    if (!defaultCourse) throw new NotFoundException("Course not found");

    // Cập nhật/Tạo mới user_progress
    const dbUser = await this.prisma.users.findUnique({ where: { id: userId } });
    const userName = dbUser?.full_name || dbUser?.username || "User";

    await this.prisma.user_progress.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        active_course_id: defaultCourse.id,
        user_name: userName,
        user_image_src: "/mascot.svg",
        languages: languages ?? ["en"],
        primary_language: primaryLanguage ?? "en",
        goals: goals ?? [],
        intensity: intensity ?? "standard",
        custom_goal: customGoal,
      },
      update: {
        active_course_id: defaultCourse.id,
        user_name: userName,
        languages: languages ?? undefined,
        primary_language: primaryLanguage ?? undefined,
        goals: goals ?? undefined,
        intensity: intensity ?? undefined,
        custom_goal: customGoal ?? undefined,
      },
    });

    // 3. Đánh dấu hoàn thành tất cả challenges của các unit có độ khó thấp hơn cấp độ đã chọn
    const targetUnitOrder = validLevels.indexOf(level) + 1; // A1=1, A2=2, B1=3, B2=4

    if (targetUnitOrder > 1) {
      // Tìm các unit cần vượt qua
      const unitsToComplete = await this.prisma.units.findMany({
        where: {
          course_id: defaultCourse.id,
          order: { lt: targetUnitOrder },
        },
        include: {
          lessons: {
            include: {
              challenges: true,
            },
          },
        },
      });

      const challengeIdsToComplete = unitsToComplete
        .flatMap((u) => u.lessons)
        .flatMap((l) => l.challenges)
        .map((c) => c.id);

      if (challengeIdsToComplete.length > 0) {
        // Tạo các bản ghi hoàn thành trong challenge_progress (bỏ qua nếu đã có)
        await this.prisma.challenge_progress.createMany({
          data: challengeIdsToComplete.map((cid) => ({
            user_id: userId,
            challenge_id: cid,
            completed: true,
          })),
          skipDuplicates: true,
        });
      }
    }

    return {
      status: "CONFIRMED",
      confirmedLevel: level,
      activeCourseId: defaultCourse.id,
    };
  }

  /**
   * Lưu trạng thái tiến trình onboarding vào database
   */
  async updateOnboardingState(step: number, data: any) {
    const { userId } = await auth();
    if (!userId) throw new BadRequestException("Unauthorized");

    let session = await this.prisma.placement_test_sessions.findUnique({
      where: { user_id: userId },
    });

    if (!session) {
      session = await this.prisma.placement_test_sessions.create({
        data: {
          user_id: userId,
          current_theta: 2.0,
          answered_count: 0,
          theta_history: [],
          used_word_ids: [],
          status: "IN_PROGRESS",
          buffer_options: [],
        },
      });
    }

    return this.prisma.placement_test_sessions.update({
      where: { user_id: userId },
      data: {
        onboarding_step: step,
        onboarding_data: data,
      },
    });
  }

  /**
   * Reset session kiểm tra để làm lại bài test thích ứng
   */
  async resetTest() {
    const { userId } = await auth();
    if (!userId) throw new BadRequestException("Unauthorized");

    // Xóa session placement test
    await this.prisma.placement_test_sessions.deleteMany({
      where: { user_id: userId },
    });

    // Reset lại toàn bộ challenge_progress của người dùng để bắt đầu từ đầu
    await this.prisma.challenge_progress.deleteMany({
      where: { user_id: userId },
    });

    return { status: "RESET_SUCCESS" };
  }
}
