export const useIsEditMode = () =>
  new URLSearchParams(location.search).get("mode") === "edit";
export const members = {
  getCurrentMember: async () => {
    const response = await fetch("/fixture/member");
    return response.json();
  },
};
export const items = {
  query: () => {
    const builder = {
      eq: () => builder,
      or: () => builder,
      descending: () => builder,
      limit: () => builder,
      find: async () => {
        const response = await fetch("/fixture/applications");
        return response.json();
      },
    };
    return builder;
  },
  insert: async (_collection: string, data: object) => {
    const response = await fetch("/fixture/applications", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "content-type": "application/json" },
    });
    return response.json();
  },
};
