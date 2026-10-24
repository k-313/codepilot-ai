import {
  AiProvider,
  AnalysisContext,
  RepositoryAnalysisResult,
  CodeExplanationContext,
  CodeExplanationResult,
  QuestionContext,
  QuestionAnswerResult,
  UnitTestContext,
  UnitTestResult,
  RawCodeFinding,
} from '../types';

export class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  async analyzeRepository(context: AnalysisContext): Promise<RepositoryAnalysisResult> {
    const findings: RawCodeFinding[] = [];
    const importantDependencies: string[] = [];

    // Extract dependencies if package.json is present
    const pkgFile = context.files.find((f) => f.path.endsWith('package.json'));
    if (pkgFile) {
      try {
        const parsed = JSON.parse(pkgFile.content);
        const deps = { ...parsed.dependencies, ...parsed.devDependencies };
        importantDependencies.push(...Object.keys(deps).slice(0, 10));
      } catch {
        importantDependencies.push('TypeScript', 'React', 'Node.js');
      }
    } else {
      importantDependencies.push('TypeScript', 'Node.js', 'PostgreSQL');
    }

    // Heuristic scan across files for realistic findings
    for (const file of context.files) {
      const lines = file.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // 1. JWT signing without expiration
        if (line.includes('jwt.sign(') && !file.content.includes('expiresIn')) {
          findings.push({
            title: 'JWT Generated Without Expiration Time',
            severity: 'high',
            category: 'security',
            filePath: file.path,
            startLine: lineNum,
            endLine: lineNum + 2,
            snippet: line.trim(),
            explanation:
              'The JWT token is created without an explicit "expiresIn" option. Tokens that never expire pose a high security risk if leaked or intercepted.',
            recommendedFix:
              'Provide an explicit expiration timestamp (e.g. { expiresIn: "1h" }) in the jwt.sign options.',
            confidence: 'high',
          });
        }

        // 2. SQL injection via template string interpolation
        if (
          (line.includes('SELECT ') || line.includes('INSERT ') || line.includes('UPDATE ')) &&
          line.includes('${')
        ) {
          findings.push({
            title: 'Potential SQL Injection via Template Literal Interpolation',
            severity: 'critical',
            category: 'security',
            filePath: file.path,
            startLine: lineNum,
            endLine: lineNum,
            snippet: line.trim(),
            explanation:
              'Dynamic string interpolation inside a raw SQL query can allow arbitrary SQL injection if input is not parameterized or sanitized.',
            recommendedFix:
              'Use parameterized queries with prepared placeholders or an ORM query builder like Drizzle or Knex.',
            confidence: 'high',
          });
        }

        // 3. Flawed HTML sanitization via regex
        if (line.includes('.replace(/<[^>]*>?/')) {
          findings.push({
            title: 'Incomplete HTML Sanitization via Regular Expression',
            severity: 'medium',
            category: 'security',
            filePath: file.path,
            startLine: lineNum,
            endLine: lineNum,
            snippet: line.trim(),
            explanation:
              'Stripping tags using a simple regex can be bypassed by nested or malformed markup (e.g. <<SCRIPT>script...>) leading to Cross-Site Scripting (XSS).',
            recommendedFix:
              'Use an established, battle-tested sanitization library like DOMPurify or sanitize-html.',
            confidence: 'high',
          });
        }

        // 4. Hardcoded default secrets
        if (
          (line.includes('SECRET') || line.includes('PASSWORD')) &&
          (line.includes("'insecure") || line.includes('"secret"') || line.includes("'default'"))
        ) {
          findings.push({
            title: 'Insecure Hardcoded Fallback Secret',
            severity: 'critical',
            category: 'security',
            filePath: file.path,
            startLine: lineNum,
            endLine: lineNum,
            snippet: line.trim(),
            explanation:
              'The application defines an insecure default secret key. If the environment variable is missing in production, this default secret leaves the application vulnerable to forgery.',
            recommendedFix:
              'Throw a fatal configuration error on startup if required secret environment variables are absent.',
            confidence: 'high',
          });
        }

        // 5. Raw error leakage
        if (line.includes('throw new Error(') && line.includes('err.message')) {
          findings.push({
            title: 'Internal Error Details Leaked to Caller',
            severity: 'medium',
            category: 'bug',
            filePath: file.path,
            startLine: lineNum,
            endLine: lineNum,
            snippet: line.trim(),
            explanation:
              'Catching internal exceptions and exposing their raw message to the caller can leak system paths, database table names, or cryptographic details.',
            recommendedFix:
              'Log internal errors privately and return generic, user-safe error messages with unique request IDs.',
            confidence: 'medium',
          });
        }
      }
    }

    // Default findings if clean code
    if (findings.length === 0) {
      findings.push({
        title: 'Review Input Validation Boundaries',
        severity: 'low',
        category: 'maintainability',
        filePath: context.files[0]?.path || 'src/index.ts',
        startLine: 1,
        endLine: 5,
        snippet: '// Input handling logic',
        explanation:
          'Ensure strict schema validation with Zod or TypeScript type guards across all public API entrypoints.',
        recommendedFix:
          'Wrap incoming payload deserialization with schema.parse() or safeParse().',
        confidence: 'medium',
      });
    }

    const summary = `CodePilot AI analyzed repository ${context.owner}/${context.repo} containing ${context.files.length} scanned source files. The codebase exhibits a modular structure with structured layer separation.`;

    const architectureOverview = `### Architecture Overview\n\n- **Repository**: \`${context.owner}/${context.repo}\`\n- **Scanned Files**: ${context.files.length} source modules\n- **Core Pattern**: Modular service-oriented architecture with route handlers and data access layers.\n- **Primary Runtime**: Modern TypeScript / Node.js runtime.\n\n### Code Quality Assessment\n- The repository demonstrates clear module naming and separation of concerns.\n- Review findings highlight key areas in authentication token handling and parameter validation.\n- Identified ${findings.length} actionable review findings across scanned files.`;

    return {
      summary,
      architectureOverview,
      importantDependencies,
      findings,
      evidenceNotes:
        'Findings are based directly on static analysis of provided source files. Missing environment configurations are inferred based on industry standards.',
    };
  }

  async explainCode(context: CodeExplanationContext): Promise<CodeExplanationResult> {
    const lines = context.code.split('\n');
    const isAuth = context.filePath.includes('auth') || context.code.includes('token');

    return {
      title: context.selectedFunction
        ? `Explanation of \`${context.selectedFunction}\``
        : `Explanation of \`${context.filePath}\``,
      explanation: `This module defines ${lines.length} lines of code handling ${
        isAuth ? 'authentication security and token verification' : 'application logic and data processing'
      }. It exports core utility functions designed to be consumed by upstream route handlers or services.`,
      parametersAndOutputs:
        'Accepts input payloads, performs validation and formatting, and returns typed outcomes or throws controlled errors upon validation failure.',
      complexityAndPerformance:
        'Time complexity is O(1) to O(N) depending on input length. Memory allocation is bounded by input payload size.',
      potentialEdgeCases: [
        'Malformed or empty input strings passing through boundaries without prior validation',
        'Expired credentials or unexpected null/undefined values in nested payload objects',
        'Asynchronous network latency or unexpected disconnection from downstream persistence stores',
      ],
      evidence: [
        `File verified at path: ${context.filePath}`,
        `Total line count: ${lines.length}`,
        `Exported definitions detected directly in source text`,
      ],
      assumptions: [
        'Downstream database or client callers are assumed to handle rejected promises or exceptions',
        'Environment variables are assumed to be loaded in the host runtime environment',
      ],
    };
  }

  async answerQuestion(context: QuestionContext): Promise<QuestionAnswerResult> {
    const question = context.question.toLowerCase();
    const referencedFiles: Array<{ path: string; startLine?: number; endLine?: number }> = [];

    let answer = '';
    const relevantFile = context.files[0];

    if (relevantFile) {
      referencedFiles.push({
        path: relevantFile.path,
        startLine: 1,
        endLine: Math.min(25, relevantFile.content.split('\n').length),
      });
    }

    if (question.includes('auth') || question.includes('jwt') || question.includes('token')) {
      const authFile = context.files.find((f) => f.path.includes('auth') || f.path.includes('jwt'));
      if (authFile) {
        referencedFiles[0] = { path: authFile.path, startLine: 1, endLine: 20 };
        answer = `Based on [${authFile.path}](file:///${authFile.path}), authentication is implemented via JSON Web Tokens (JWT). The token creation routine uses a secret key configured in the environment. Note that tokens in this implementation require explicit expiration options to prevent long-lived session replay risks.`;
      } else {
        answer = `I analyzed the available source files (${context.files.map((f) => f.path).join(', ')}). No dedicated authentication module was detected in the loaded context, indicating auth may be handled externally or in files outside the current selection.`;
      }
    } else if (question.includes('database') || question.includes('db') || question.includes('sql')) {
      answer = `The codebase interacts with the database layer using SQL and typed schemas. Data access queries should consistently use parameterized statements to guard against injection. Citing [${relevantFile?.path || 'repository'}] for current data flow patterns.`;
    } else {
      answer = `Based on the retrieved repository files (${context.files.map((f) => f.path).join(', ')}), the application is organized around modular components. The system entrypoint initializes core services and delegates requests to specific controllers or utility functions.`;
    }

    return {
      answer,
      contextFiles: referencedFiles,
      isEvidence: true,
      assumptions: [
        'Assuming dependencies in package.json are up-to-date and installed in target runtime',
        'Assuming standard Node.js/TypeScript execution environment',
      ],
    };
  }

  async generateUnitTests(context: UnitTestContext): Promise<UnitTestResult> {
    const framework = context.testFramework || 'vitest';
    const funcName = context.functionName || 'targetFunction';

    const testCode = `import { describe, it, expect, vi } from '${framework}';
import * as targetModule from './${context.filePath.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '')}';

describe('${funcName} Test Suite', () => {
  it('executes the primary happy path with valid parameters', async () => {
    // Arrange: set up expected input and mock dependencies
    const input = { id: 'test-id-123', status: 'active' };

    // Act: invoke the target module
    // const result = await targetModule.${funcName}(input);

    // Assert: verify expected response structure
    expect(true).toBe(true);
  });

  it('handles invalid inputs and throws descriptive errors', async () => {
    // Arrange: invalid or empty payload
    const invalidInput = null;

    // Act & Assert: verify graceful rejection
    // await expect(targetModule.${funcName}(invalidInput as any)).rejects.toThrow();
    expect(true).toBe(true);
  });

  it('gracefully handles boundary conditions and missing values', async () => {
    // Arrange boundary condition
    const boundaryInput = { id: '' };
    // Act & Assert
    expect(boundaryInput.id).toBe('');
  });
});
`;

    return {
      framework,
      testCode,
      explanation: `Generated unit test suite for ${context.filePath} using ${framework}. Covers happy paths, null/invalid payload boundaries, and error rejection assertions.`,
      coveredScenarios: [
        'Happy path execution with valid parameters',
        'Rejection and error handling on null or malformed inputs',
        'Boundary cases with empty string parameters',
      ],
    };
  }
}
