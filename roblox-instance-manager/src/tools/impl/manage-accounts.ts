import { AccountStore } from "../../accounts/store.js";

export async function handleManageAccounts(
  params: { action: string; alias?: string; cookie?: string },
  accountStore: AccountStore
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  switch (params.action) {
    case "add": {
      if (!params.alias || !params.cookie) {
        return { content: [{ type: "text", text: "Both 'alias' and 'cookie' are required for add action." }] };
      }
      await accountStore.addAccount(params.alias, params.cookie);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, message: `Account "${params.alias}" added.` }, null, 2),
        }],
      };
    }
    case "list": {
      const accounts = accountStore.listAccounts();
      if (accounts.length === 0) {
        return { content: [{ type: "text", text: "No accounts stored." }] };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify(accounts, null, 2),
        }],
      };
    }
    case "remove": {
      if (!params.alias) {
        return { content: [{ type: "text", text: "'alias' is required for remove action." }] };
      }
      const removed = accountStore.removeAccount(params.alias);
      if (!removed) {
        return { content: [{ type: "text", text: `Account "${params.alias}" not found.` }] };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, message: `Account "${params.alias}" removed.` }, null, 2),
        }],
      };
    }
    default:
      return { content: [{ type: "text", text: `Unknown action: ${params.action}. Use add, list, or remove.` }] };
  }
}