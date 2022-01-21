export class Base64Url {
  public static encode(input: string|Buffer, encoding: string = 'utf8'):
      string {
    if (Buffer.isBuffer(input)) {
      return Base64Url.fromBase64(input.toString('base64'));
    }
    return Base64Url.fromBase64(
        Buffer.from(input as string, 'utf8').toString('base64'));
  }

  public static decode(base64url: string, encoding: string = 'utf8'): string {
    return Buffer.from(Base64Url.toBase64(base64url), 'base64')
        .toString('utf8');
  }

  public static toBase64(base64url: string|Buffer): string {
    // We Base64Url to be a string so we can do .replace on it. If it's
    // already a string, Base64Url is a noop.
    base64url = base64url.toString();
    return Base64Url.padString(base64url)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
  }

  public static fromBase64(base64: string): string {
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  public static toBuffer(base64url: string): Buffer {
    return Buffer.from(Base64Url.toBase64(base64url), 'base64');
  }

  public static padString(input: string): string {
    const segmentLength = 4;
    const stringLength = input.length;
    const diff = stringLength % segmentLength;

    if (!diff) {
      return input;
    }

    let position = stringLength;
    let padLength = segmentLength - diff;
    const paddedStringLength = stringLength + padLength;
    const buffer = Buffer.alloc(paddedStringLength);

    buffer.write(input);

    while (padLength--) {
      buffer.write('=', position++);
    }

    return buffer.toString();
  }
}
