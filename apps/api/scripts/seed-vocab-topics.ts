import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@prisma/client";

type TopicSeedDefinition = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
};

const topicDefinitions: TopicSeedDefinition[] = [
  {
    slug: "daily-life",
    title: "Daily Life",
    description: "Common words for everyday routines and situations.",
    keywords: [
      "day",
      "home",
      "house",
      "room",
      "sleep",
      "wake",
      "morning",
      "evening",
      "time",
      "life",
      "daily",
      "clean",
      "wear",
      "clothes",
      "tired",
      "happy",
      "afternoon",
      "đời",
      "nhà",
      "phòng",
      "ngủ",
      "buổi",
      "sáng",
      "chiều",
      "quần áo",
    ],
  },
  {
    slug: "food-drink",
    title: "Food & Drink",
    description: "Meals, cooking, restaurants, and drinks.",
    keywords: [
      "food",
      "drink",
      "meal",
      "eat",
      "cook",
      "restaurant",
      "rice",
      "bread",
      "water",
      "coffee",
      "tea",
      "fruit",
      "vegetable",
      "breakfast",
      "lunch",
      "dinner",
      "taste",
      "món",
      "ăn",
      "uống",
      "bữa",
      "nấu",
      "nhà hàng",
      "cơm",
      "nước",
      "cà phê",
    ],
  },
  {
    slug: "travel",
    title: "Travel",
    description: "Words for trips, transport, hotels, and places.",
    keywords: [
      "travel",
      "trip",
      "hotel",
      "ticket",
      "passport",
      "airport",
      "train",
      "bus",
      "flight",
      "luggage",
      "map",
      "destination",
      "arrival",
      "departure",
      "tour",
      "visit",
      "journey",
      "aeroplane",
      "airplane",
      "du lịch",
      "vé",
      "khách sạn",
      "sân bay",
      "hành lý",
      "bản đồ",
      "chuyến",
      "tàu",
      "xe buýt",
    ],
  },
  {
    slug: "work-office",
    title: "Work & Office",
    description: "Workplace, business, jobs, meetings, and productivity.",
    keywords: [
      "work",
      "job",
      "office",
      "meeting",
      "manager",
      "employee",
      "business",
      "company",
      "project",
      "deadline",
      "email",
      "career",
      "salary",
      "interview",
      "task",
      "team",
      "làm việc",
      "công việc",
      "văn phòng",
      "công ty",
      "kinh doanh",
      "dự án",
      "họp",
      "nhân viên",
      "quản lý",
    ],
  },
  {
    slug: "school",
    title: "School",
    description: "Learning, classes, study, and education.",
    keywords: [
      "school",
      "student",
      "teacher",
      "class",
      "lesson",
      "study",
      "learn",
      "book",
      "exam",
      "test",
      "homework",
      "education",
      "university",
      "college",
      "course",
      "grade",
      "học",
      "trường",
      "sinh viên",
      "học sinh",
      "giáo viên",
      "sách",
      "bài",
      "thi",
      "kiểm tra",
      "giáo dục",
    ],
  },
  {
    slug: "health",
    title: "Health",
    description: "Health, body, illness, exercise, and medical words.",
    keywords: [
      "health",
      "doctor",
      "medicine",
      "hospital",
      "pain",
      "fever",
      "sick",
      "ill",
      "body",
      "exercise",
      "diet",
      "treatment",
      "symptom",
      "recover",
      "sleep",
      "stress",
      "sức khỏe",
      "bác sĩ",
      "thuốc",
      "bệnh",
      "đau",
      "sốt",
      "cơ thể",
      "tập thể dục",
      "điều trị",
      "triệu chứng",
    ],
  },
  {
    slug: "shopping",
    title: "Shopping",
    description: "Buying, selling, prices, stores, and products.",
    keywords: [
      "buy",
      "sell",
      "shop",
      "store",
      "market",
      "price",
      "cost",
      "pay",
      "product",
      "customer",
      "order",
      "discount",
      "sale",
      "cheap",
      "expensive",
      "receipt",
      "mua",
      "bán",
      "cửa hàng",
      "chợ",
      "giá",
      "trả tiền",
      "sản phẩm",
      "khách hàng",
      "đơn hàng",
      "giảm giá",
    ],
  },
  {
    slug: "family",
    title: "Family",
    description: "People, relationships, and home life.",
    keywords: [
      "family",
      "mother",
      "father",
      "parent",
      "child",
      "children",
      "son",
      "daughter",
      "brother",
      "sister",
      "husband",
      "wife",
      "friend",
      "relationship",
      "marry",
      "relative",
      "gia đình",
      "mẹ",
      "cha",
      "bố",
      "con",
      "anh",
      "chị",
      "em",
      "vợ",
      "chồng",
      "bạn",
      "họ hàng",
    ],
  },
  {
    slug: "technology",
    title: "Technology",
    description: "Computers, internet, devices, and digital life.",
    keywords: [
      "technology",
      "computer",
      "phone",
      "internet",
      "online",
      "software",
      "data",
      "website",
      "app",
      "device",
      "digital",
      "screen",
      "email",
      "message",
      "network",
      "code",
      "công nghệ",
      "máy tính",
      "điện thoại",
      "mạng",
      "trực tuyến",
      "dữ liệu",
      "thiết bị",
      "kỹ thuật số",
      "màn hình",
    ],
  },
  {
    slug: "environment",
    title: "Environment",
    description: "Nature, climate, pollution, and sustainability.",
    keywords: [
      "environment",
      "nature",
      "tree",
      "river",
      "pollution",
      "climate",
      "weather",
      "energy",
      "waste",
      "recycle",
      "protect",
      "planet",
      "animal",
      "forest",
      "ocean",
      "green",
      "môi trường",
      "thiên nhiên",
      "cây",
      "sông",
      "ô nhiễm",
      "khí hậu",
      "thời tiết",
      "năng lượng",
      "rác",
      "bảo vệ",
      "động vật",
    ],
  },
  {
    slug: "money",
    title: "Money",
    description: "Finance, banking, prices, payment, and economy.",
    keywords: [
      "money",
      "bank",
      "cash",
      "pay",
      "payment",
      "price",
      "cost",
      "budget",
      "save",
      "salary",
      "tax",
      "loan",
      "bill",
      "finance",
      "economic",
      "profit",
      "tiền",
      "ngân hàng",
      "tiền mặt",
      "thanh toán",
      "giá",
      "chi phí",
      "ngân sách",
      "lương",
      "thuế",
      "hóa đơn",
      "tài chính",
      "lợi nhuận",
    ],
  },
  {
    slug: "communication",
    title: "Communication",
    description: "Speaking, listening, messages, and social interaction.",
    keywords: [
      "speak",
      "listen",
      "talk",
      "say",
      "tell",
      "ask",
      "answer",
      "question",
      "message",
      "call",
      "reply",
      "explain",
      "discuss",
      "conversation",
      "opinion",
      "communicate",
      "agree",
      "reply",
      "respond",
      "clarify",
      "persuade",
      "nói",
      "nghe",
      "hỏi",
      "trả lời",
      "câu hỏi",
      "tin nhắn",
      "giải thích",
      "thảo luận",
      "ý kiến",
      "giao tiếp",
    ],
  },
];

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const normalizeText = (value: string) => {
  return value.toLowerCase();
};

const getTopicMatches = (
  item: {
    word: string;
    normalized_word: string;
    meaning_vi: string;
    primary_meaning_vi: string;
  },
  topics: TopicSeedDefinition[]
) => {
  const haystack = normalizeText(
    [
      item.word,
      item.normalized_word,
      item.meaning_vi,
      item.primary_meaning_vi,
    ].join(" ")
  );

  return topics.filter((topic) =>
    topic.keywords.some((keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      const canUseSubstringMatch = normalizedKeyword.length >= 4;

      return (
        haystack.includes(` ${normalizedKeyword} `) ||
        haystack.startsWith(`${normalizedKeyword} `) ||
        haystack.endsWith(` ${normalizedKeyword}`) ||
        haystack === normalizedKeyword ||
        (canUseSubstringMatch && haystack.includes(normalizedKeyword))
      );
    })
  );
};

const main = async () => {
  console.log("Upserting vocabulary topics");

  for (const [index, topic] of topicDefinitions.entries()) {
    await prisma.vocabulary_topics.upsert({
      where: { slug: topic.slug },
      create: {
        slug: topic.slug,
        title: topic.title,
        description: topic.description,
        order: index + 1,
      },
      update: {
        title: topic.title,
        description: topic.description,
        order: index + 1,
      },
    });
  }

  const topics = await prisma.vocabulary_topics.findMany();
  const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));
  const vocabularyItems = await prisma.vocabulary_items.findMany({
    select: {
      id: true,
      word: true,
      normalized_word: true,
      meaning_vi: true,
      primary_meaning_vi: true,
    },
  });

  console.log("Clearing previous topic assignments");
  await prisma.vocabulary_item_topics.deleteMany();

  let assignmentCount = 0;
  const unmatchedSamples: string[] = [];

  for (const item of vocabularyItems) {
    const matches = getTopicMatches(item, topicDefinitions).slice(0, 3);

    if (matches.length === 0 && unmatchedSamples.length < 20) {
      unmatchedSamples.push(item.word);
    }

    for (const match of matches) {
      const topic = topicBySlug.get(match.slug);
      if (!topic) continue;

      await prisma.vocabulary_item_topics.create({
        data: {
          vocabulary_item_id: item.id,
          topic_id: topic.id,
        },
      });
      assignmentCount += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        topics: topicDefinitions.length,
        vocabularyItems: vocabularyItems.length,
        assignments: assignmentCount,
        unmatchedSamples,
      },
      null,
      2
    )
  );
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
