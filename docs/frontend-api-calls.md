# API, Admin, Web Integration Convention

Tài liệu này định nghĩa cách tổ chức API backend và cách gọi API từ Admin/Web trong monorepo. Có thể dùng lại cho nhiều dự án NestJS + Next.js/React.

Mục tiêu là tách rõ:

- `apps/api`: nơi expose HTTP endpoint và xử lý business flow.
- `apps/admin`: dashboard nội bộ gọi API qua service/hook.
- `apps/web`: public/customer-facing app gọi API qua service/hook riêng.
- `packages/shared`: nơi chứa contract/type/schema dùng chung.

## Mục Tiêu

- Không gọi API trực tiếp trong view/component.
- API call có type rõ ràng, dễ test và dễ đổi backend client.
- View chỉ compose UI và gọi hook.
- Server state được quản lý thống nhất bằng query/mutation hooks.
- Service layer là nơi duy nhất biết endpoint HTTP cụ thể.
- Type API dùng chung nên đặt ở shared package nếu dự án là monorepo.
- Backend controller không chứa business logic.
- Backend use case là nơi xử lý nghiệp vụ.
- Backend repository là nơi truy cập database.

## Monorepo Folder Tổng Quát

```txt
apps/
├── api/
│   └── src/modules/<domain>/
│       ├── <domain>.module.ts
│       ├── <domain>.controller.ts
│       ├── dto/
│       ├── repository/
│       ├── use-cases/
│       ├── tests/
│       └── <domain>.types.ts
├── admin/
│   └── src/
│       ├── services/<domain>/
│       ├── views/<domain>/
│       ├── hooks/
│       ├── lib/
│       └── config/
└── web/
    └── src/
        ├── services/<domain>/
        ├── views/<domain>/
        ├── hooks/
        ├── lib/
        └── config/

packages/
└── shared/
    └── src/
        ├── types/
        ├── schemas/
        ├── constants/
        └── utils/
```

## Luồng Tổng Quát Giữa API, Admin, Web

```txt
packages/shared
  -> định nghĩa type/schema/constant dùng chung

apps/api
  -> import shared contract nếu cần
  -> expose /api/v1/<resource>
  -> controller -> use case -> repository -> database

apps/admin
  -> import shared contract
  -> services/admin HTTP client
  -> React Query hooks
  -> internal dashboard views

apps/web
  -> import shared contract
  -> services/public/customer HTTP client
  -> React Query hooks hoặc server fetch
  -> public/customer views
```

## Khác Nhau Giữa Admin Và Web

### Admin

Admin thường cần:

- auth token nội bộ;
- permission gating;
- CRUD đầy đủ;
- destructive action có confirm dialog;
- table/search/filter/pagination;
- toast cho create/update/delete;
- route bảo vệ bằng role/permission.

Vị trí:

```txt
apps/admin/src/services/products/products.service.ts
apps/admin/src/views/products/hooks/use-products.ts
apps/admin/src/views/products/products.view.tsx
```

### Web

Web thường cần:

- public API hoặc customer-auth API;
- chỉ expose những field an toàn cho user;
- không dùng permission nội bộ;
- ưu tiên SEO/server rendering nếu là public page;
- không tái sử dụng admin view/component private.

Vị trí:

```txt
apps/web/src/services/products/products.service.ts
apps/web/src/views/products/product-detail.view.tsx
apps/web/src/views/account/warranties/hooks/use-my-warranties.ts
```

### Không Dùng Chung Service Giữa Admin Và Web Nếu Auth/Scope Khác Nhau

Không nên ép dùng chung một service instance nếu:

- Admin dùng `/api/v1/products` với quyền nội bộ.
- Web dùng `/api/v1/public/products` hoặc `/api/v1/me/products`.
- Header auth khác nhau.
- Response field khác nhau.

Có thể dùng chung type/helper, nhưng service nên tách:

```txt
apps/admin/src/services/products/products.service.ts
apps/web/src/services/products/products.service.ts
```

## Backend API Convention Trong `apps/api`

Backend dùng luồng:

```txt
Controller -> UseCase -> Repository -> Prisma/database
```

### API Module Structure

```txt
apps/api/src/modules/products/
├── products.module.ts
├── products.controller.ts
├── dto/
│   ├── create-product.dto.ts
│   ├── update-product.dto.ts
│   └── list-products.dto.ts
├── repository/
│   └── products.repository.ts
├── use-cases/
│   ├── create-product.use-case.ts
│   ├── update-product.use-case.ts
│   ├── list-products.use-case.ts
│   └── get-product-detail.use-case.ts
├── tests/
│   └── create-product.use-case.spec.ts
└── products.types.ts
```

### Controller Mẫu

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { permission_key } from "@prisma/client";
import { Permissions } from "@/common/decorators/permissions.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { ListProductsDto } from "./dto/list-products.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateProductUseCase } from "./use-cases/create-product.use-case";
import { GetProductDetailUseCase } from "./use-cases/get-product-detail.use-case";
import { ListProductsUseCase } from "./use-cases/list-products.use-case";
import { SoftDeleteProductUseCase } from "./use-cases/soft-delete-product.use-case";
import { UpdateProductUseCase } from "./use-cases/update-product.use-case";

@Controller("products")
export class ProductsController {
  constructor(
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly softDeleteProductUseCase: SoftDeleteProductUseCase,
  ) {}

  @Get()
  @Permissions([permission_key.PRODUCT_VIEW])
  list(@Query() query: ListProductsDto) {
    return this.listProductsUseCase.execute(query);
  }

  @Post()
  @Permissions([permission_key.PRODUCT_CREATE])
  create(@Body() dto: CreateProductDto) {
    return this.createProductUseCase.execute(dto);
  }

  @Get(":id")
  @Permissions([permission_key.PRODUCT_VIEW])
  detail(@Param("id") id: string) {
    return this.getProductDetailUseCase.execute(id);
  }

  @Patch(":id")
  @Permissions([permission_key.PRODUCT_UPDATE])
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.updateProductUseCase.execute(id, dto);
  }

  @Delete(":id")
  @Permissions([permission_key.PRODUCT_DELETE])
  remove(@Param("id") id: string) {
    return this.softDeleteProductUseCase.execute(id);
  }
}
```

Rule:

- Controller chỉ nhận HTTP input và gọi use case.
- Không query Prisma trong controller.
- Không xử lý business rule trong controller.
- Permission gắn ở controller method.

### DTO Mẫu

```ts
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { product_status } from "@prisma/client";

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsEnum(product_status)
  status?: product_status;
}
```

### Use Case Mẫu

```ts
import { ConflictError } from "@/common/response";
import { Injectable } from "@nestjs/common";
import { CreateProductDto } from "../dto/create-product.dto";
import { ProductsRepository } from "../repository/products.repository";
import { toProductResponse } from "../products.types";

@Injectable()
export class CreateProductUseCase {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async execute(dto: CreateProductDto) {
    const existing = await this.productsRepository.findByName(dto.name);

    if (existing) {
      throw new ConflictError("Product name already exists");
    }

    const product = await this.productsRepository.create({
      name: dto.name,
      status: dto.status,
    });

    return toProductResponse(product);
  }
}
```

Rule:

- Use case chứa business flow.
- Use case có thể throw domain/client error.
- Use case trả response shape đã map cho client.

### Repository Mẫu

```ts
import { PrismaService } from "@/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class ProductsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findById(id: string) {
    return this.prismaService.product.findUnique({
      where: { id },
    });
  }

  findByName(name: string) {
    return this.prismaService.product.findFirst({
      where: { name },
    });
  }

  create(data: Prisma.ProductCreateInput) {
    return this.prismaService.product.create({
      data,
    });
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prismaService.product.update({
      where: { id },
      data,
    });
  }
}
```

Rule:

- Repository chứa data access.
- Repository có thể chứa filter/sort/pagination query.
- Repository không chứa business decision.

### API Response Mapper

File:

```txt
apps/api/src/modules/products/products.types.ts
```

```ts
import type { ProductResponse } from "@repo/shared";

type ProductModel = {
  id: string;
  product_code: string;
  name: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export function toProductResponse(product: ProductModel): ProductResponse {
  return {
    id: product.id,
    productCode: product.product_code,
    name: product.name,
    status: product.status as ProductResponse["status"],
    createdAt: product.created_at.toISOString(),
    updatedAt: product.updated_at.toISOString(),
  };
}
```

Rule:

- API DB model thường là snake_case.
- FE response nên là camelCase.
- Mapping nên đặt ở module types/helper, không rải trong controller.

### Use Case Test Mẫu

```ts
import { ConflictError } from "@/common/response";
import { CreateProductUseCase } from "../use-cases/create-product.use-case";

function createRepositoryMock() {
  return {
    findByName: jest.fn(),
    create: jest.fn(),
  };
}

describe("CreateProductUseCase", () => {
  it("creates a product when name is unique", async () => {
    const repository = createRepositoryMock();
    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: "product-id",
      product_code: "PRD-001",
      name: "SUV",
      status: "ACTIVE",
      created_at: new Date("2026-01-01T00:00:00.000Z"),
      updated_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    const useCase = new CreateProductUseCase(repository as never);

    await expect(useCase.execute({ name: "SUV" })).resolves.toMatchObject({
      id: "product-id",
      name: "SUV",
    });
  });

  it("rejects duplicate product name", async () => {
    const repository = createRepositoryMock();
    repository.findByName.mockResolvedValue({ id: "existing-id" });

    const useCase = new CreateProductUseCase(repository as never);

    await expect(useCase.execute({ name: "SUV" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
```

## Admin API Calling Convention Trong `apps/admin`

Admin dùng client riêng:

```txt
apps/admin/src/services/http/admin-http-client.ts
apps/admin/src/services/products/products.service.ts
apps/admin/src/views/products/hooks/use-products.ts
apps/admin/src/views/products/hooks/use-products-directory.ts
apps/admin/src/views/products/products.view.tsx
```

Admin nên dùng:

- TanStack Query;
- React Hook Form;
- Zod;
- i18n;
- toast;
- permission guard;
- confirm dialog cho destructive action.

Admin service gọi endpoint nội bộ:

```ts
await adminHttpClient.get("/products");
await adminHttpClient.post("/products", body);
await adminHttpClient.patch(`/products/${id}`, body);
await adminHttpClient.delete(`/products/${id}`);
```

Không gọi API trong Admin component:

```tsx
// Không nên
useEffect(() => {
  fetch("/api/v1/products");
}, []);
```

Dùng hook:

```tsx
const { productsQuery } = useProductsDirectory();
```

## Web API Calling Convention Trong `apps/web`

Web có 2 kiểu gọi API.

### 1. Public/customer page cần SEO

Nếu page cần SEO hoặc render server-side, có thể gọi API ở server function/service server-safe.

```txt
apps/web/src/services/products/products-public.service.ts
apps/web/app/products/[slug]/page.tsx
```

Mẫu:

```ts
export async function getPublicProduct(slug: string) {
  const response = await fetch(
    `${process.env.API_URL}/public/products/${slug}`,
    {
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    throw new Error("Unable to load product");
  }

  return response.json();
}
```

Page:

```tsx
import { getPublicProduct } from "@/src/services/products/products-public.service";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);

  return <ProductDetailView product={product} />;
}
```

Rule:

- Server-side web service không dùng `localStorage`.
- Token nếu cần nên lấy từ cookie/server session.
- Public API không nên trả field nội bộ.

### 2. Customer dashboard/client interaction

Nếu page cần interaction nhiều, dùng React Query giống Admin nhưng service riêng của Web.

```txt
apps/web/src/services/warranties/my-warranties.service.ts
apps/web/src/views/account/warranties/hooks/use-my-warranties.ts
```

Mẫu:

```ts
export function useMyWarranties() {
  return useQuery({
    queryKey: ["my-warranties"],
    queryFn: () => myWarrantiesService.list(),
  });
}
```

Web service gọi endpoint theo customer scope:

```ts
await webHttpClient.get("/me/warranties");
await webHttpClient.post("/warranty-claims", body);
```

Không dùng Admin endpoint cho Web nếu dữ liệu cần giới hạn theo customer.

## Stack Khuyến Nghị

### Bắt buộc hoặc gần như bắt buộc

- React Query / TanStack Query: quản lý server state, cache, loading, error, refetch, mutation.
- Zod: validate form hoặc parse data khi cần runtime validation.
- React Hook Form: quản lý form phức tạp.
- Fetch wrapper hoặc Axios instance: HTTP client dùng chung.
- TypeScript strict mode: giữ contract rõ ràng.

### Nên dùng theo nhu cầu

- `@repo/shared` hoặc package shared tương đương: chứa API/domain types dùng chung FE/BE.
- `next-intl` hoặc i18n tương đương: không hardcode message trong component.
- Toast library: feedback cho create/update/delete/action.
- MSW: mock API cho Storybook/test nếu cần.

### Không nên dùng bừa

- Không gọi `fetch()` rải rác trong component.
- Không gọi Axios trực tiếp trong view.
- Không để endpoint string ở nhiều nơi.
- Không để query key trong component.
- Không đặt DTO/domain type trong component nếu type đó dùng lại nhiều nơi.

## Luồng Chuẩn

```txt
Route page
  -> View
    -> Feature workflow hook
      -> React Query hook
        -> Service
          -> HTTP client
            -> API
```

Ví dụ:

```txt
products.view.tsx
  -> useProductsDirectory()
    -> useProducts()
      -> productsService.listProducts()
        -> adminHttpClient.get("/products")
```

## Folder Structure Khuyến Nghị

```txt
src/
├── services/
│   └── products/
│       ├── create-products.service.ts
│       ├── products.service.ts
│       └── products.service.test.ts
├── views/
│   └── products/
│       ├── products.view.tsx
│       ├── products.constants.ts
│       ├── products.types.ts
│       ├── products.utils.ts
│       ├── components/
│       │   └── products-table.tsx
│       └── hooks/
│           ├── use-products.ts
│           ├── use-products-directory.ts
│           └── use-product-form.ts
└── lib/
    └── http-client.ts
```

Nếu service chỉ có một file thì vẫn có thể đặt:

```txt
src/services/products/products.service.ts
```

Không cần tạo `index.ts` nếu không có nhu cầu re-export thật.

## Vai Trò Từng Layer

### Page

Page chỉ import view và render.

```tsx
import { ProductsView } from "@/src/views/products/products.view";

export default function ProductsPage() {
  return <ProductsView />;
}
```

Không đặt `"use client"` vào page nếu framework hỗ trợ server component như Next.js App Router.

### View

View compose UI, gọi workflow hook, truyền data/action xuống component.

```tsx
"use client";

export function ProductsView() {
  const {
    productsQuery,
    search,
    updateSearch,
    setPage,
  } = useProductsDirectory();

  return (
    <ProductsDirectoryCard
      data={productsQuery.data}
      isLoading={productsQuery.isLoading}
      onSearchChange={updateSearch}
      onPageChange={setPage}
      search={search}
    />
  );
}
```

View không gọi service trực tiếp.

### Workflow Hook

Workflow hook gom state của màn hình: search, filter, page, permission, dialog state, toast action.

```ts
export function useProductsDirectory() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 300);

  const productsQuery = useProducts({
    page,
    search: debouncedSearch || undefined,
  });

  return {
    productsQuery,
    search,
    setPage,
    updateSearch: setSearch,
  };
}
```

### React Query Hook

React Query hook quản lý query key, query function, mutation và invalidation.

```ts
export const productQueryKeys = {
  all: ["products"] as const,
  list: (query: ListProductsQuery) =>
    [...productQueryKeys.all, "list", query] as const,
  detail: (id: string) => [...productQueryKeys.all, "detail", id] as const,
};

export function useProducts(query: ListProductsQuery) {
  return useQuery({
    queryKey: productQueryKeys.list(query),
    queryFn: () => productsService.listProducts(query),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProductBody) =>
      productsService.createProduct(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      });
    },
  });
}
```

Không viết query key trực tiếp trong component.

### Service

Service là nơi duy nhất biết endpoint HTTP.

```ts
export function createProductsService(http: ProductsHttpClient) {
  return {
    async listProducts(query: ListProductsQuery) {
      return unwrap(
        await http.get<PaginatedResponse<ProductResponse>>("/products", {
          params: query,
        }),
      );
    },

    async createProduct(body: CreateProductBody) {
      return unwrap(await http.post<ProductResponse>("/products", body));
    },
  };
}
```

Tách `createProductsService(http)` để test service dễ hơn.

```ts
export const productsService = createProductsService(adminHttpClient);
```

### HTTP Client

HTTP client xử lý base URL, auth header, JSON parse, error normalize.

```ts
export const adminHttpClient = createHttpClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  getAccessToken: () => authStorage.getAccessToken(),
});
```

Không đọc env trực tiếp trong từng service.

## Type Contract

Nếu type dùng chung FE/BE, đặt ở shared package:

```txt
packages/shared/src/types/product.types.ts
```

Ví dụ:

```ts
export type ProductResponse = {
  id: string;
  productCode: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
};

export type ListProductsQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateProductBody = {
  name: string;
  status?: "ACTIVE" | "INACTIVE";
};
```

Nếu type chỉ phục vụ UI state của một view, đặt trong feature:

```txt
src/views/products/products.types.ts
```

Ví dụ:

```ts
export type ProductStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
```

## Form Submit Flow

Form không gọi service trực tiếp. Form gọi hook, hook gọi mutation.

```tsx
export function ProductForm() {
  const { register, onSubmit, isSubmitting } = useProductForm();

  return (
    <form onSubmit={onSubmit}>
      <input {...register("name")} />
      <button disabled={isSubmitting}>Save</button>
    </form>
  );
}
```

```ts
export function useProductForm() {
  const createProduct = useCreateProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
  });

  async function submit(values: ProductFormValues) {
    await createProduct.mutateAsync(toCreateProductBody(values));
  }

  return {
    ...form,
    isSubmitting: form.formState.isSubmitting || createProduct.isPending,
    onSubmit: form.handleSubmit(submit),
  };
}
```

## Error Handling

Service nên throw error đã normalize từ HTTP client.

Hook hoặc workflow xử lý error thành field error/toast.

```ts
try {
  await createProduct.mutateAsync(body);
  toast.success(t("created"));
} catch (error) {
  if (error instanceof HttpClientError && error.message === "Duplicate code") {
    form.setError("code", { message: t("duplicateCode") });
    return;
  }

  toast.error(t("saveError"));
}
```

Không parse HTTP error trong component UI nhỏ như table row/button.

## Loading, Empty, Error State

List view cần đủ state:

- loading
- error
- empty
- no-result khi có filter/search
- forbidden nếu có permission gating

```tsx
if (isLoading) return <SkeletonList />;

if (isError) {
  return <StatePanel title={t("loadErrorTitle")} action={retryButton} />;
}

if (data.items.length === 0 && hasFilters) {
  return <StatePanel title={t("emptyFilteredTitle")} />;
}

if (data.items.length === 0) {
  return <StatePanel title={t("emptyTitle")} />;
}
```

## Search, Filter, Pagination

Search gọi API nên debounce khoảng 300ms.

```ts
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search.trim(), 300);
```

Khi đổi filter/search nên reset page về 1.

```ts
function updateStatus(status: StatusFilter) {
  setStatus(status);
  setPage(1);
}
```

Pagination dùng meta backend trả về, không tự tính từ length.

```ts
data.meta.page
data.meta.total
data.meta.totalPages
```

## Permission Gating

Permission nên kiểm tra ở view/workflow, không chỉ ẩn button ở component con.

```tsx
<PermissionGuard permissions={[PERMISSIONS.PRODUCT_VIEW]}>
  <ProductsViewContent />
</PermissionGuard>
```

Action button kiểm tra permission riêng:

```tsx
{canCreate ? <CreateButton /> : null}
```

## Naming Convention

```txt
services/products/products.service.ts
services/products/create-products.service.ts
services/products/products.service.test.ts

views/products/products.view.tsx
views/products/hooks/use-products.ts
views/products/hooks/use-products-directory.ts
views/products/hooks/use-product-form.ts
views/products/components/products-table.tsx
views/products/components/delete-product-dialog.tsx
```

Function naming:

```ts
listProducts()
getProduct()
createProduct()
updateProduct()
deleteProduct()
assignProductOwner()
```

Hook naming:

```ts
useProducts()
useProduct()
useCreateProduct()
useUpdateProduct()
useProductsDirectory()
useProductForm()
```

## Test Strategy

Service test dùng fake HTTP client.

```ts
test("list products calls products endpoint with query", async () => {
  const calls: unknown[] = [];
  const http = {
    get: async (url: string, options: unknown) => {
      calls.push({ url, options });
      return { data: { items: [], meta: paginationMeta } };
    },
  };

  await createProductsService(http).listProducts({ page: 1 });

  assert.deepEqual(calls, [
    {
      url: "/products",
      options: { params: { page: 1 } },
    },
  ]);
});
```

Workflow/component test chỉ cần khi logic UI phức tạp.

## Checklist Khi Thêm API Mới Ở Frontend

- [ ] Có type request/response rõ ràng.
- [ ] Type dùng chung đặt ở shared package.
- [ ] Có service riêng cho domain.
- [ ] Không gọi HTTP client trực tiếp trong view/component.
- [ ] Có React Query hook với query key ổn định.
- [ ] Mutation invalidate đúng query.
- [ ] Search có debounce nếu gọi list API.
- [ ] Pagination dùng meta backend.
- [ ] Có loading/error/empty/no-result state.
- [ ] Có toast hoặc inline feedback cho mutation.
- [ ] Destructive action có confirm dialog.
- [ ] Có i18n cho label/toast/error.
- [ ] Có permission gating nếu API cần quyền.
- [ ] Có test service tối thiểu.
- [ ] Lint/typecheck/test pass.

## Rule Ngắn Gọn

```txt
Component không biết endpoint.
View không gọi HTTP.
Hook quản lý server state.
Service gọi API.
HTTP client xử lý transport.
Shared package giữ contract dùng chung.
```

## Code Mẫu Đầy Đủ

Ví dụ dưới đây dùng feature `products`. Có thể thay `products` bằng `users`, `customers`, `orders`, `categories`, ...

### 1. Shared API Types

File:

```txt
packages/shared/src/types/product.types.ts
```

```ts
export type ProductStatus = "ACTIVE" | "INACTIVE" | "DELETED";

export type ProductResponse = {
  id: string;
  productCode: string;
  name: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type ListProductsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: Exclude<ProductStatus, "DELETED">;
  sortBy?: "name" | "productCode" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export type CreateProductBody = {
  name: string;
  status?: Exclude<ProductStatus, "DELETED">;
};

export type UpdateProductBody = {
  name?: string;
  status?: Exclude<ProductStatus, "DELETED">;
};
```

### 2. HTTP Client

File:

```txt
src/lib/http-client.ts
```

```ts
export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
};

export function createHttpClient({
  baseUrl,
  getAccessToken,
}: {
  baseUrl: string;
  getAccessToken?: () => string | null;
}) {
  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    const url = new URL(path, baseUrl);

    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    const token = getAccessToken?.();
    const response = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<T>
      | null;

    if (!response.ok) {
      throw new HttpClientError(
        payload?.message ?? "Request failed",
        response.status,
        payload,
      );
    }

    if (!payload) {
      throw new HttpClientError("Invalid API response", response.status);
    }

    return payload;
  }

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>("GET", path, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>("POST", path, { ...options, body }),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>("PATCH", path, { ...options, body }),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>("DELETE", path, options),
  };
}

export function unwrap<T>(response: ApiEnvelope<T>): T {
  if (!response.success || response.data === undefined) {
    throw new HttpClientError(response.message ?? "Invalid response", 500);
  }

  return response.data;
}
```

### 3. App HTTP Client Instance

File:

```txt
src/services/http/admin-http-client.ts
```

```ts
import { createHttpClient } from "@/src/lib/http-client";

export const adminHttpClient = createHttpClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api/v1",
  getAccessToken: () => localStorage.getItem("accessToken"),
});
```

Nếu app render server-side, không đọc `localStorage` trực tiếp trong môi trường server. Khi đó token nên lấy qua cookie hoặc auth provider.

### 4. Service Factory

File:

```txt
src/services/products/create-products.service.ts
```

```ts
import type {
  CreateProductBody,
  ListProductsQuery,
  PaginatedResponse,
  ProductResponse,
  UpdateProductBody,
} from "@repo/shared";
import { unwrap, type ApiEnvelope } from "@/src/lib/http-client";

export type ProductsHttpClient = {
  get<T>(
    path: string,
    options?: { params?: Record<string, unknown> },
  ): Promise<ApiEnvelope<T>>;
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  patch<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
  delete<T>(path: string): Promise<ApiEnvelope<T>>;
};

export function createProductsService(http: ProductsHttpClient) {
  return {
    async listProducts(query: ListProductsQuery) {
      return unwrap(
        await http.get<PaginatedResponse<ProductResponse>>("/products", {
          params: query,
        }),
      );
    },

    async getProduct(productId: string) {
      return unwrap(await http.get<ProductResponse>(`/products/${productId}`));
    },

    async createProduct(body: CreateProductBody) {
      return unwrap(await http.post<ProductResponse>("/products", body));
    },

    async updateProduct(productId: string, body: UpdateProductBody) {
      return unwrap(
        await http.patch<ProductResponse>(`/products/${productId}`, body),
      );
    },

    async deleteProduct(productId: string) {
      return unwrap(
        await http.delete<ProductResponse>(`/products/${productId}`),
      );
    },
  };
}
```

### 5. Service Instance

File:

```txt
src/services/products/products.service.ts
```

```ts
import { adminHttpClient } from "@/src/services/http/admin-http-client";
import {
  createProductsService,
  type ProductsHttpClient,
} from "./create-products.service";

export const productsService = createProductsService(
  adminHttpClient as ProductsHttpClient,
);
```

### 6. Service Test

File:

```txt
src/services/products/products.service.test.ts
```

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createProductsService } from "./create-products.service";

test("listProducts calls products endpoint with filters", async () => {
  const calls: unknown[] = [];
  const http = {
    get: async (path: string, options: unknown) => {
      calls.push({ path, options });
      return {
        success: true,
        data: {
          items: [],
          meta: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        },
      };
    },
    post: async () => ({ success: true, data: {} }),
    patch: async () => ({ success: true, data: {} }),
    delete: async () => ({ success: true, data: {} }),
  };

  await createProductsService(http).listProducts({
    page: 1,
    limit: 10,
    search: "abc",
  });

  assert.deepEqual(calls, [
    {
      path: "/products",
      options: {
        params: {
          page: 1,
          limit: 10,
          search: "abc",
        },
      },
    },
  ]);
});
```

### 7. React Query Hooks

File:

```txt
src/views/products/hooks/use-products.ts
```

```ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  CreateProductBody,
  ListProductsQuery,
  PaginatedResponse,
  ProductResponse,
  UpdateProductBody,
} from "@repo/shared";
import { productsService } from "@/src/services/products/products.service";

export const productQueryKeys = {
  all: ["products"] as const,
  list: (query: ListProductsQuery) =>
    [...productQueryKeys.all, "list", query] as const,
  detail: (productId: string) =>
    [...productQueryKeys.all, "detail", productId] as const,
};

export function useProducts(
  query: ListProductsQuery,
  options?: Pick<
    UseQueryOptions<PaginatedResponse<ProductResponse>>,
    "enabled"
  >,
) {
  return useQuery({
    queryKey: productQueryKeys.list(query),
    queryFn: () => productsService.listProducts(query),
    enabled: options?.enabled,
  });
}

export function useProduct(
  productId: string | null,
  options?: Pick<UseQueryOptions<ProductResponse>, "enabled">,
) {
  return useQuery({
    queryKey: productQueryKeys.detail(productId ?? ""),
    queryFn: () => productsService.getProduct(productId ?? ""),
    enabled: Boolean(productId) && options?.enabled !== false,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProductBody) =>
      productsService.createProduct(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      });
    },
  });
}

export function useUpdateProduct(productId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateProductBody) =>
      productsService.updateProduct(productId ?? "", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      });
      if (productId) {
        void queryClient.invalidateQueries({
          queryKey: productQueryKeys.detail(productId),
        });
      }
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => productsService.deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productQueryKeys.all,
      });
    },
  });
}
```

### 8. Directory Workflow Hook

File:

```txt
src/views/products/hooks/use-products-directory.ts
```

```ts
import { useState } from "react";
import { useDebounce } from "@repo/hooks";
import type { ProductResponse } from "@repo/shared";
import { useToast } from "@/src/hooks/use-toast";
import { useDeleteProduct, useProducts } from "./use-products";

const PAGE_SIZE = 10;

export function useProductsDirectory() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [productToDelete, setProductToDelete] =
    useState<ProductResponse | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 300);

  const productsQuery = useProducts({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status === "ALL" ? undefined : status,
  });

  const deleteProduct = useDeleteProduct();

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateStatus(value: "ALL" | "ACTIVE" | "INACTIVE") {
    setStatus(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setPage(1);
  }

  async function confirmDelete() {
    if (!productToDelete) return;

    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      toast.success("Deleted.");
      setProductToDelete(null);
    } catch {
      toast.error("Unable to delete.");
    }
  }

  return {
    clearFilters,
    confirmDelete,
    isDeleting: deleteProduct.isPending,
    page,
    productToDelete,
    productsQuery,
    search,
    setPage,
    setProductToDelete,
    status,
    updateSearch,
    updateStatus,
  };
}
```

### 9. View

File:

```txt
src/views/products/products.view.tsx
```

```tsx
"use client";

import { useProductsDirectory } from "./hooks/use-products-directory";
import { ProductsDirectoryCard } from "./components/products-directory-card";
import { DeleteProductDialog } from "./components/delete-product-dialog";

export function ProductsView() {
  const {
    clearFilters,
    confirmDelete,
    isDeleting,
    productToDelete,
    productsQuery,
    search,
    setPage,
    setProductToDelete,
    status,
    updateSearch,
    updateStatus,
  } = useProductsDirectory();

  return (
    <>
      <ProductsDirectoryCard
        data={productsQuery.data}
        isError={productsQuery.isError}
        isLoading={productsQuery.isLoading}
        onClearFilters={clearFilters}
        onDelete={setProductToDelete}
        onPageChange={setPage}
        onRetry={() => {
          void productsQuery.refetch();
        }}
        onSearchChange={updateSearch}
        onStatusChange={updateStatus}
        search={search}
        status={status}
      />

      <DeleteProductDialog
        isDeleting={isDeleting}
        onConfirm={() => {
          void confirmDelete();
        }}
        onOpenChange={(open) => {
          if (!open) setProductToDelete(null);
        }}
        open={Boolean(productToDelete)}
        product={productToDelete}
      />
    </>
  );
}
```

### 10. Directory Component

File:

```txt
src/views/products/components/products-directory-card.tsx
```

```tsx
import type { PaginatedResponse, ProductResponse } from "@repo/shared";

type ProductsDirectoryCardProps = {
  data?: PaginatedResponse<ProductResponse>;
  isError: boolean;
  isLoading: boolean;
  onClearFilters: () => void;
  onDelete: (product: ProductResponse) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "ALL" | "ACTIVE" | "INACTIVE") => void;
  search: string;
  status: "ALL" | "ACTIVE" | "INACTIVE";
};

export function ProductsDirectoryCard({
  data,
  isError,
  isLoading,
  onClearFilters,
  onDelete,
  onPageChange,
  onRetry,
  onSearchChange,
  onStatusChange,
  search,
  status,
}: ProductsDirectoryCardProps) {
  if (isLoading) return <div>Loading...</div>;

  if (isError) {
    return (
      <div>
        <p>Unable to load products.</p>
        <button onClick={onRetry}>Try again</button>
      </div>
    );
  }

  const items = data?.items ?? [];
  const hasFilters = Boolean(search.trim()) || status !== "ALL";

  return (
    <section>
      <div>
        <input
          aria-label="Search products"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search products"
          value={search}
        />

        <select
          aria-label="Filter by status"
          onChange={(event) =>
            onStatusChange(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")
          }
          value={status}
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div>
          <p>{hasFilters ? "No matching products." : "No products yet."}</p>
          {hasFilters ? (
            <button onClick={onClearFilters}>Clear filters</button>
          ) : null}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.productCode}</td>
                <td>{product.status}</td>
                <td>
                  <button onClick={() => onDelete(product)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data ? (
        <div>
          <button
            disabled={data.meta.page <= 1}
            onClick={() => onPageChange(data.meta.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <button
            disabled={data.meta.page >= data.meta.totalPages}
            onClick={() => onPageChange(data.meta.page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
```

### 11. Form Schema

File:

```txt
src/views/products/products.types.ts
```

```ts
import { z } from "zod";

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "nameRequired")
    .max(160, "nameLength"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormValues = z.output<typeof productFormSchema>;
```

### 12. Form Hook

File:

```txt
src/views/products/hooks/use-product-form.ts
```

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { HttpClientError } from "@/src/lib/http-client";
import { useToast } from "@/src/hooks/use-toast";
import {
  productFormSchema,
  type ProductFormInput,
  type ProductFormValues,
} from "../products.types";
import { useCreateProduct } from "./use-products";

export function useProductForm({ onSaved }: { onSaved: () => void }) {
  const toast = useToast();
  const createProduct = useCreateProduct();

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      status: "ACTIVE",
    },
  });

  async function submit(values: ProductFormValues) {
    try {
      await createProduct.mutateAsync({
        name: values.name,
        status: values.status,
      });
      toast.success("Product created.");
      onSaved();
    } catch (error) {
      if (
        error instanceof HttpClientError &&
        error.message === "Product name already exists"
      ) {
        form.setError("name", {
          message: "This product name already exists.",
        });
        return;
      }

      toast.error("Unable to save product.");
    }
  }

  return {
    ...form,
    isSubmitting: form.formState.isSubmitting || createProduct.isPending,
    onSubmit: form.handleSubmit(submit),
  };
}
```

### 13. Form Component

File:

```txt
src/views/products/components/product-form.tsx
```

```tsx
import { useProductForm } from "../hooks/use-product-form";

export function ProductForm({ onSaved }: { onSaved: () => void }) {
  const {
    formState: { errors },
    isSubmitting,
    onSubmit,
    register,
  } = useProductForm({ onSaved });

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="product-name">Name</label>
      <input id="product-name" {...register("name")} />
      {errors.name?.message ? <p>{errors.name.message}</p> : null}

      <label htmlFor="product-status">Status</label>
      <select id="product-status" {...register("status")}>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>

      <button disabled={isSubmitting} type="submit">
        Save
      </button>
    </form>
  );
}
```
