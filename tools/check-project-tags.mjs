// Every Nx project has exactly one scope:*, one type:* and one platform:* tag: a project
// without a tag falls under no module-boundary rule (journal 026, ADR-0007). The list comes
// from the Nx project graph, so projects outside apps/ and libs/ (tools/*) count too.
// Run: pnpm check:project-tags (also a CI step).
import { createProjectGraphAsync } from '@nx/devkit';

const { nodes } = await createProjectGraphAsync({ exitOnError: true });
const problems = Object.values(nodes).flatMap(({ name, data }) => {
  const tags = data.tags ?? [];
  return ['scope', 'type', 'platform']
    .filter(
      (axis) => tags.filter((tag) => tag.startsWith(`${axis}:`)).length !== 1,
    )
    .map(
      (axis) =>
        `${name}: needs exactly one ${axis}:* tag, has [${tags.join(', ')}]`,
    );
});

if (problems.length > 0) {
  console.error(
    problems.join('\n') + '\nTags: see eslint.config.mjs (depConstraints).',
  );
  process.exit(1);
}
console.log(
  `${Object.keys(nodes).length} projects, each with one scope, type and platform tag - ok`,
);
