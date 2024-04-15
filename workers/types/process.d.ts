declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB: D1Database;

      [key: string]: string | any | undefined;

      // The KV Namespace binding type used here comes
      // from `@cloudflare/workers-types`, in order to
      // use it like so, make sure that you have installed
      // the package as a dev dependency and you have added
      // it to your `tsconfig.json` file under
      // `compilerOptions.types`.            DB: D1Database;
    }
  }
}

export {};
