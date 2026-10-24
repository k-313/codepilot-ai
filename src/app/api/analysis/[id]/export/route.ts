import { NextRequest, NextResponse } from 'next/server';
import { initDb, analyses, repositories, codeFindings } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await initDb();

    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, id))
      .limit(1);

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const [repo] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, analysis.repositoryId))
      .limit(1);

    const findings = await db
      .select()
      .from(codeFindings)
      .where(eq(codeFindings.analysisId, analysis.id));

    // Generate Markdown report
    const dateStr = new Date(analysis.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const severityCounts = {
      critical: findings.filter((f: any) => f.severity === 'critical').length,
      high: findings.filter((f: any) => f.severity === 'high').length,
      medium: findings.filter((f: any) => f.severity === 'medium').length,
      low: findings.filter((f: any) => f.severity === 'low').length,
      info: findings.filter((f: any) => f.severity === 'info').length,
    };

    let md = `# CodePilot AI — Code Review & Architecture Report\n\n`;
    md += `**Repository**: [${repo.fullName}](${repo.url})\n`;
    md += `**Default Branch**: \`${repo.defaultBranch}\`\n`;
    md += `**Date of Analysis**: ${dateStr}\n`;
    md += `**Files Scanned**: ${analysis.totalFilesScanned}\n`;
    md += `**Total Findings Identified**: ${findings.length}\n\n`;

    md += `## Executive Summary\n\n${analysis.summary || 'No summary available.'}\n\n`;

    if (analysis.architectureOverview) {
      md += `## Architecture Overview\n\n${analysis.architectureOverview}\n\n`;
    }

    const deps = (analysis.importantDependencies as string[]) || [];
    if (deps.length > 0) {
      md += `## Core Dependencies & Frameworks\n\n`;
      for (const dep of deps) {
        md += `- \`${dep}\`\n`;
      }
      md += `\n`;
    }

    md += `## Findings Summary\n\n`;
    md += `| Severity | Count |\n`;
    md += `| :--- | :--- |\n`;
    md += `| 🔴 Critical | ${severityCounts.critical} |\n`;
    md += `| 🟠 High | ${severityCounts.high} |\n`;
    md += `| 🟡 Medium | ${severityCounts.medium} |\n`;
    md += `| 🔵 Low | ${severityCounts.low} |\n`;
    md += `| ⚪ Info | ${severityCounts.info} |\n\n`;

    md += `## Detailed Findings\n\n`;

    if (findings.length === 0) {
      md += `_No findings were reported for this analysis._\n\n`;
    } else {
      findings.forEach((finding: any, idx: number) => {
        const lineRange =
          finding.startLine && finding.endLine
            ? `Lines ${finding.startLine}–${finding.endLine}`
            : finding.startLine
            ? `Line ${finding.startLine}`
            : 'General';

        md += `### ${idx + 1}. [${finding.severity.toUpperCase()}] ${finding.title}\n\n`;
        md += `- **File**: \`${finding.filePath}\` (${lineRange})\n`;
        md += `- **Category**: ${finding.category}\n`;
        md += `- **Confidence**: ${finding.confidence}\n\n`;

        md += `**Explanation**:\n${finding.explanation}\n\n`;

        if (finding.snippet) {
          md += `**Relevant Code Snippet**:\n\`\`\`\n${finding.snippet}\n\`\`\`\n\n`;
        }

        md += `**Recommended Fix**:\n${finding.recommendedFix}\n\n`;
        md += `---\n\n`;
      });
    }

    md += `## Security & Advisory Notice\n\n`;
    md += `> [!NOTE]\n`;
    md += `> CodePilot AI findings are generated through automated heuristic analysis and AI model inspection. These findings represent potential risks, architectural trade-offs, and quality recommendations. They should be verified by a software engineer in context and are not guaranteed vulnerabilities or certified exploits.\n`;

    return new NextResponse(md, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="codepilot-${repo.owner}-${repo.name}-analysis.md"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to export report' },
      { status: 500 }
    );
  }
}
