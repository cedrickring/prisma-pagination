export function indentString(string: string, count = 1) {
  if (count < 0) {
    throw new RangeError(
      `Expected \`count\` to be at least 0, got \`${count}\``
    );
  }

  if (count === 0) {
    return string;
  }

  const regex = /^(?!\s*$)/gm;

  return string.replace(regex, " ".repeat(count));
}

export function omit<T, Key extends keyof T>(
  obj: T,
  keys: Array<Key>
): Omit<T, Key> {
  const result: Omit<T, Key> = {} as any;
  Object.entries(obj).forEach(([key, value]) => {
    if (keys.includes(key as Key)) {
      return;
    }
    result[key as keyof typeof result] = value;
  })
  return result;
}
