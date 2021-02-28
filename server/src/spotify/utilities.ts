export function getId(value: string, type: string): string | undefined {
  if (!value?.includes(type)) return undefined;
  return value?.substring(7 + 1 + type.length + 1);
}
