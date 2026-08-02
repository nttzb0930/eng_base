import { z } from "zod";

const integerSetting = (minimum: number, maximum: number) =>
  z
    .number({ error: "Vui lòng nhập một số nguyên." })
    .int("Vui lòng nhập một số nguyên.")
    .min(minimum, `Giá trị tối thiểu là ${minimum}.`)
    .max(maximum, `Giá trị tối đa là ${maximum}.`);

export const systemSettingsSchema = z.object({
  maxHearts: integerSetting(1, 99),
  practiceWordsPerLesson: integerSetting(5, 50),
  weakWordsLimit: integerSetting(5, 100),
  dailyReviewRelaxedLimit: integerSetting(1, 50),
  dailyReviewStandardLimit: integerSetting(1, 100),
  dailyReviewAcceleratedLimit: integerSetting(1, 150),
  dailyReviewIntensiveLimit: integerSetting(1, 200),
  registrationEnabled: z.boolean(),
});

export type SystemSettingsFormValues = z.infer<typeof systemSettingsSchema>;
