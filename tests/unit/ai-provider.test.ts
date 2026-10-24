import { describe, it, expect } from 'vitest';
import { getAiProvider, MockAiProvider } from '@/lib/ai';
import { rawCodeFindingSchema } from '@/lib/ai/types';

describe('AI Provider Factory & Adapter', () => {
  it('returns MockAiProvider when AI_PROVIDER is mock or keys are absent', () => {
    const provider = getAiProvider('mock');
    expect(provider).toBeInstanceOf(MockAiProvider);
    expect(provider.name).toBe('mock');
  });

  it('validates raw code finding schemas against Zod constraints', () => {
    const validFinding = {
      title: 'Potential SQL Injection',
      severity: 'critical' as const,
      category: 'security' as const,
      filePath: 'src/api/users.ts',
      startLine: 12,
      endLine: 14,
      snippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
      explanation: 'Direct string interpolation inside SQL query.',
      recommendedFix: 'Use parameterized queries or an ORM.',
      confidence: 'high' as const,
    };

    const parsed = rawCodeFindingSchema.parse(validFinding);
    expect(parsed.title).toBe(validFinding.title);
    expect(parsed.severity).toBe('critical');

    // Invalid severity should throw
    expect(() =>
      rawCodeFindingSchema.parse({
        ...validFinding,
        severity: 'fatal',
      })
    ).toThrow();
  });
});

describe('Mock AI Provider Analysis & Detection Heuristics', () => {
  const provider = new MockAiProvider();

  it('detects JWT without expiration and SQL injection in code files', async () => {
    const files = [
      {
        path: 'src/auth/jwt.ts',
        content: `export function signToken(payload) {\n  return jwt.sign(payload, SECRET);\n}`,
      },
      {
        path: 'src/api/query.ts',
        content: `export function findUser(id) {\n  const q = \`SELECT * FROM users WHERE id = '\${id}'\`;\n  return db.raw(q);\n}`,
      },
    ];

    const result = await provider.analyzeRepository({
      owner: 'acme',
      repo: 'backend',
      files,
    });

    expect(result.summary).toBeDefined();
    expect(result.findings.length).toBeGreaterThanOrEqual(2);

    const jwtFinding = result.findings.find((f) => f.title.includes('JWT'));
    expect(jwtFinding).toBeDefined();
    expect(jwtFinding?.severity).toBe('high');
    expect(jwtFinding?.category).toBe('security');

    const sqlFinding = result.findings.find((f) => f.title.includes('SQL Injection'));
    expect(sqlFinding).toBeDefined();
    expect(sqlFinding?.severity).toBe('critical');
  });

  it('explains code with input/output and edge cases', async () => {
    const explanation = await provider.explainCode({
      filePath: 'src/auth/jwt.ts',
      code: 'export function signToken(payload) { return jwt.sign(payload, SECRET); }',
      selectedFunction: 'signToken',
    });

    expect(explanation.title).toContain('signToken');
    expect(explanation.potentialEdgeCases.length).toBeGreaterThan(0);
    expect(explanation.evidence.length).toBeGreaterThan(0);
    expect(explanation.assumptions.length).toBeGreaterThan(0);
  });

  it('generates unit tests with idiomatic test structure', async () => {
    const unitTests = await provider.generateUnitTests({
      filePath: 'src/utils/math.ts',
      functionName: 'calculateTotal',
      code: 'export function calculateTotal(items) { return items.reduce((a, b) => a + b, 0); }',
      testFramework: 'vitest',
    });

    expect(unitTests.framework).toBe('vitest');
    expect(unitTests.testCode).toContain('describe');
    expect(unitTests.testCode).toContain('calculateTotal Test Suite');
    expect(unitTests.coveredScenarios.length).toBeGreaterThan(0);
  });

  it('answers questions citing source files and line ranges', async () => {
    const answer = await provider.answerQuestion({
      question: 'How is JWT authentication handled?',
      files: [
        {
          path: 'src/auth/jwt.ts',
          content: 'export function signToken() {}',
        },
      ],
    });

    expect(answer.answer).toContain('JWT');
    expect(answer.contextFiles.length).toBeGreaterThan(0);
    expect(answer.isEvidence).toBe(true);
  });
});
