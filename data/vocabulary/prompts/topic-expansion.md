# Vocabulary Topic Expansion Prompt Template

You are an expert English lexicographer and curriculum designer for an ESL learning platform.
Your task is to generate authentic, high-frequency, and relevant English vocabulary items for a specified **TOPIC**.

---

## GENERATION REQUEST

Generate **{{BATCH_NEEDED}}** NEW, UNIQUE English vocabulary items for TOPIC: **"{{TOPIC_TITLE}}"** (slug: `"{{TOPIC_SLUG}}"`, group: `"{{TOPIC_GROUP}}"`).

---

## STRICT GENERATION RULES

1. **TOPIC RELEVANCE**:
   - Every generated word MUST directly relate to the specified TOPIC.
   - Do NOT include generic words (like "thing", "make", "good") unless they have a very specific domain meaning within the topic.

2. **BALANCED CEFR DISTRIBUTION**:
   - Provide a natural distribution of CEFR levels (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`) suitable for learners progressing through the topic.

3. **EXACT FIELD FORMATS & NAMES**:
   - `word`: English word or common compound term (lowercase, e.g. "algorithm", "artificial intelligence").
   - `normalizedWord`: Normalized lowercase string with accents removed.
   - `pos`: Part of speech in lowercase (`noun`, `verb`, `adjective`, `adverb`, `phrase`).
   - `posVi`: Vietnamese translation of part of speech (e.g. `danh từ`, `động từ`, `tính từ`, `trạng từ`, `cụm từ`).
   - `cefrLevel`: One of `A1`, `A2`, `B1`, `B2`, `C1`, `C2`.
   - `phonetic`: Accurate International Phonetic Alphabet (IPA) inside slashes (e.g. `/ˈæl.ɡə.rɪ.ðəm/`).
   - `primaryMeaningVi`: Concise 1–3 word Vietnamese translation for flashcards.
   - `meaningVi`: Full, clear Vietnamese definition or contextual translation.
   - `source`: `"ai-topic-expansion"`.
   - `exampleEn`: English example sentence representing example #1.
   - `exampleVi`: Vietnamese translation of example #1.
   - `exampleSource`: `"ai-topic-expansion"`.
   - `examples`: An array of EXACTLY 10 distinct, natural English-Vietnamese example sentence pairs:
     ```json
     [
       {
         "exampleEn": "Natural English sentence 1.",
         "exampleVi": "Bản dịch tiếng Việt tự nhiên của câu 1."
       },
       ... 10 objects total
     ]
     ```

4. **QUOTE SAFETY**:
   - Use SINGLE QUOTES (`'`) for any nested quotes inside example sentences or translations (e.g., `'delicious'`). NEVER use unescaped double quotes inside string values.

5. **NO DUPLICATES**:
   - Strictly DO NOT generate any word listed in the `EXCLUDED_WORDS` array:
   {{EXCLUDED_WORDS}}

---

## CONCRETE OUTPUT EXAMPLE (JSON)

```json
{
  "topicSlug": "food",
  "items": [
    {
      "word": "ingredient",
      "normalizedWord": "ingredient",
      "pos": "noun",
      "posVi": "danh từ",
      "cefrLevel": "B1",
      "phonetic": "/ɪnˈɡriː.di.ənt/",
      "primaryMeaningVi": "thành phần",
      "meaningVi": "Một trong những thực phẩm hoặc nguyên liệu được kết hợp để làm nên một món ăn.",
      "exampleEn": "Fresh herbs are essential ingredients in authentic Italian cooking.",
      "exampleVi": "Thảo mộc tươi là những thành phần thiết yếu trong ẩm thực Ý chính thống.",
      "examples": [
        {
          "exampleEn": "Fresh herbs are essential ingredients in authentic Italian cooking.",
          "exampleVi": "Thảo mộc tươi là những thành phần thiết yếu trong ẩm thực Ý chính thống."
        },
        {
          "exampleEn": "Always check the list of ingredients for potential food allergens.",
          "exampleVi": "Luôn kiểm tra danh sách thành phần để biết các chất có thể gây dị ứng thực phẩm."
        },
        {
          "exampleEn": "Patience is the secret ingredient to making a rich bone broth.",
          "exampleVi": "Sự kiên nhẫn là thành phần bí mật để ninh được hầm xương đậm đà."
        },
        {
          "exampleEn": "The chef sourced all organic ingredients from local family farms.",
          "exampleVi": "Đầu bếp nhập tất cả thành phần hữu cơ từ các trang trại gia đình địa phương."
        },
        {
          "exampleEn": "Mix all dry ingredients in a large bowl before adding the milk.",
          "exampleVi": "Trộn tất cả thành phần khô trong bát lớn trước khi thêm sữa."
        },
        {
          "exampleEn": "Quality ingredients can transform a simple recipe into a gourmet meal.",
          "exampleVi": "Thành phần chất lượng có thể biến một công thức đơn giản thành bữa ăn thượng hạng."
        },
        {
          "exampleEn": "We are missing a key ingredient for the chocolate cake batter.",
          "exampleVi": "Chúng tôi đang thiếu một thành phần quan trọng cho bột bánh sô-cô-la."
        },
        {
          "exampleEn": "This salad contains high-protein ingredients like quinoa and chickpeas.",
          "exampleVi": "Món salad này chứa các thành phần giàu protein như hạt diêm mạch và đậu gà."
        },
        {
          "exampleEn": "Store fresh ingredients in airtight containers to maintain flavor.",
          "exampleVi": "Bảo quản thành phần tươi trong hộp kín để giữ trọn hương vị."
        },
        {
          "exampleEn": "Traditional Asian recipes rely on aromatic ingredients like ginger and garlic.",
          "exampleVi": "Các công thức nấu ăn châu Á truyền thống phụ thuộc vào các thành phần dậy mùi như gừng và tỏi."
        }
      ]
    }
  ]
}
```

---

## REQUIRED OUTPUT JSON SCHEMA

Return ONLY valid JSON matching this schema:
{{RESPONSE_SCHEMA}}
