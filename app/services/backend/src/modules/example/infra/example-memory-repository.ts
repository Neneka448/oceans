export class ExampleMemoryRepository {
  private readonly values: string[] = [];

  push(value: string): void {
    this.values.push(value);
  }

  list(): string[] {
    return [...this.values];
  }
}
