export const generateIdentity = () => `
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type UserIdentity = Record<string, JsonValue>;
const isJsonValue = (value: unknown): value is JsonValue => {
 if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
 if (typeof value === 'number') return Number.isFinite(value);
 if (Array.isArray(value)) return value.every(isJsonValue);
 return typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every(isJsonValue);
};
const isIdentity = (value: Record<string, unknown>): value is UserIdentity => Object.values(value).every(isJsonValue);
export const parseUserIdentity = (value: Record<string, unknown>): UserIdentity => {
 if (!isIdentity(value)) throw new Error('Provider identity must contain JSON values');
 return value;
};
`;
