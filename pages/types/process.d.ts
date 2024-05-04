import type {D1Database} from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;

    [key: string]: string | any | undefined;

    // The KV Namespace binding type used here comes
    // from `@cloudflare/workers-types`, in order to
    // use it like so, make sure that you have installed
    // the package as a dev dependency and you have added
    // it to your `tsconfig.json` file under
    // `compilerOptions.types`.            DB: D1Database;
    // 是否预览模式
    PREVIEW?: boolean;
    // 超级管理员名单, 使用","分割
    SUPER_ADMIN?: string;
  }
}

export {};
