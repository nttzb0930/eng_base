export const TOPIC_LOCALES = ["en", "vi"] as const;

export type TopicLocale = (typeof TOPIC_LOCALES)[number];

export type LocalizableVocabularyTopic = {
  id: number;
  slug: string;
  title: string;
  title_vi: string | null;
  description: string;
  description_vi: string | null;
  group_name: string | null;
  group_name_vi: string | null;
  order: number;
};

export function localizeVocabularyTopic(
  topic: LocalizableVocabularyTopic,
  locale: TopicLocale,
) {
  const englishGroup = topic.group_name?.trim() || "Other";

  return {
    id: topic.id,
    slug: topic.slug,
    title:
      locale === "vi" ? topic.title_vi?.trim() || topic.title : topic.title,
    description:
      locale === "vi"
        ? topic.description_vi?.trim() || topic.description
        : topic.description,
    group:
      locale === "vi"
        ? topic.group_name_vi?.trim() || englishGroup
        : englishGroup,
    order: topic.order,
  };
}
