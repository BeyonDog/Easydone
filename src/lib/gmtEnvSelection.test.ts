import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gmtEnvSelectionBlockMessage } from "./gmtEnvSelection.ts";
import { formatGmtExecErrorMessage } from "./branchEnvDisplay.ts";

describe("gmtEnvSelectionBlockMessage", () => {
  it("requires gmtEnvId when gmtEnvName is set", () => {
    assert.equal(gmtEnvSelectionBlockMessage("rct01", null), "请在下拉框选择分支环境（需区服 ID）");
  });

  it("returns null when both name and id are set", () => {
    assert.equal(gmtEnvSelectionBlockMessage("rct01", 17), null);
  });
});

describe("formatGmtExecErrorMessage", () => {
  it("explains DoesNotExist with branch hint and env id", () => {
    const msg = formatGmtExecErrorMessage(
      "DoesNotExist: Command matching query does not exist.",
      "(GRPC) rct01",
      17,
    );
    assert.match(msg, /AdminSendMail/);
    assert.match(msg, /\(GRPC\) rct01/);
    assert.match(msg, /env id=17/);
    assert.match(msg, /GSGCI/);
  });
});
