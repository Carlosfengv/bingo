import assert from "node:assert/strict";
import test from "node:test";
import { buildMcpServerInstructions } from "../codegen/aiShared";

test("Tabler guidance uses real pack names in canvas and component examples", () => {
  const prompt = buildMcpServerInstructions({iconLibraryNames: ["@tabler/icons-react"]});
  assert.match(prompt, /data-icon="IconSettings" data-icon-library="@tabler\/icons-react"/);
  assert.match(prompt, /import \{ IconPlayerPlay, IconSettings \} from '@tabler\/icons-react'/);
  assert.doesNotMatch(prompt, /data-icon-library="lucide-react"/);
  assert.match(prompt, /preserve existing icons during unrelated edits/i);
});

test("unknown icon packs request discovery instead of borrowing Lucide exports", () => {
  const prompt = buildMcpServerInstructions({iconLibraryNames: ["custom-icons"]});
  assert.match(prompt, /Call search_icons for custom-icons/);
  assert.doesNotMatch(prompt, /data-icon-library="lucide-react"/);
});
