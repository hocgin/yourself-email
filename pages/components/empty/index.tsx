import React from "react";

export type Created = {};
export const Empty: React.FC<Created> = () => {
  return <span
    className={"flex py-5 px-10 w-full items-center justify-center rounded-md border border-dashed text-sm"}>
      No Data
  </span>;
};
export default Empty;
