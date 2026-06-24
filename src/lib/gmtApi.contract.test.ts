import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAdminAddExpExecBody,
  buildAdminClearTimeoutMatchInfoExecBody,
  buildAddSproutScoreExecBody,
  buildAdminSendGlobalMailExecBody,
  buildAdminSendMailExecBody,
  SPROUT_SCORE_ONE_CLICK_AMOUNT,
} from "./gmtApi.contract.ts";

describe("buildAdminAddExpExecBody", () => {
  it("matches HAR snake_case body", () => {
    const body = buildAdminAddExpExecBody({
      envName: "sbt01",
      accountId: "10000405",
      exp: "10",
      lockRegion: "SG",
      notiRegion: "SG",
    });
    assert.equal(body.name, "AdminAddExp");
    const param = body.param as {
      env: string;
      command: Record<string, string>;
    };
    assert.equal(param.env, "sbt01");
    assert.equal(param.command.account_id, "10000405");
    assert.equal(param.command.exp, "10");
    assert.equal(param.command.lock_region, "SG");
    assert.equal(param.command.noti_region, "SG");
  });
});

describe("buildAdminSendMailExecBody", () => {
  const baseInput = {
    envName: "rct01",
    accountId: "10000913",
    lockRegion: "SG",
    notiRegion: "SG",
    tradable: false,
    rewardItems: [{ id: "821027", cnt: "1" }],
  };

  it("uses snake_case in reward item additional_info (HAR)", () => {
    const body = buildAdminSendMailExecBody(baseInput);
    const reward = (body.param as { command: { mail_info: { attachment: { reward_items: unknown[] } }[] } })
      .command.mail_info[0]!.attachment.reward_items[0] as {
      detail: { additional_info: Record<string, unknown> };
    };
    const info = reward.detail.additional_info;
    assert.ok("owner_nickname" in info);
    assert.ok(!("ownerNickname" in info));
    assert.ok("dead_reason" in info);
    assert.ok("wear_value" in info);
    assert.ok("food_material_ids" in info);
    assert.ok("recipe_id" in info);
  });

  it("includes duration_sec and init_params on reward item (HAR)", () => {
    const body = buildAdminSendMailExecBody(baseInput);
    const reward = (body.param as { command: { mail_info: { attachment: { reward_items: unknown[] } }[] } })
      .command.mail_info[0]!.attachment.reward_items[0] as Record<string, unknown>;
    assert.equal(reward.duration_sec, 0);
    assert.deepEqual(reward.init_params, {
      init_wear_value: { has_value: false, value: 0 },
      food_material_ids: [],
      recipe_id: 0,
    });
  });

  it("uses snake_case in mail additional_info (HAR)", () => {
    const body = buildAdminSendMailExecBody(baseInput);
    const mailInfo = (body.param as { command: { mail_info: { additional_info: Record<string, unknown> }[] } })
      .command.mail_info[0]!.additional_info;
    assert.ok("match_start_time" in mailInfo);
    assert.ok("teammate_nickname" in mailInfo);
    assert.ok("friend_gift_sender_id" in mailInfo);
    assert.ok("friend_gift_sender_name" in mailInfo);
    assert.ok(!("matchStartTime" in mailInfo));
  });

  it("sets param.env to API env name", () => {
    const body = buildAdminSendMailExecBody(baseInput);
    assert.equal((body.param as { env: string }).env, "rct01");
  });

  it("sets init_wear_value when wearValue provided", () => {
    const body = buildAdminSendMailExecBody({
      ...baseInput,
      rewardItems: [{ id: "101011", cnt: "1", wearValue: 37 }],
    });
    const reward = (body.param as { command: { mail_info: { attachment: { reward_items: unknown[] } }[] } })
      .command.mail_info[0]!.attachment.reward_items[0] as {
      init_params: Record<string, unknown>;
      detail: { additional_info: Record<string, unknown> };
    };
    assert.deepEqual(reward.init_params, {
      init_wear_value: { has_value: true, value: 37 },
      food_material_ids: [],
      recipe_id: 0,
    });
    assert.equal(reward.detail.additional_info.wear_value, 37);
  });

  it("keeps wear_value 0 when wearValue omitted", () => {
    const body = buildAdminSendMailExecBody(baseInput);
    const reward = (body.param as { command: { mail_info: { attachment: { reward_items: unknown[] } }[] } })
      .command.mail_info[0]!.attachment.reward_items[0] as {
      detail: { additional_info: Record<string, unknown> };
    };
    assert.equal(reward.detail.additional_info.wear_value, 0);
  });

  it("sets durability in additional_info only when durabilityValue provided", () => {
    const body = buildAdminSendMailExecBody({
      ...baseInput,
      rewardItems: [{ id: "510015", cnt: "1", durabilityValue: 8 }],
    });
    const reward = (body.param as { command: { mail_info: { attachment: { reward_items: unknown[] } }[] } })
      .command.mail_info[0]!.attachment.reward_items[0] as {
      init_params: Record<string, unknown>;
      detail: { additional_info: Record<string, unknown> };
    };
    assert.equal(reward.detail.additional_info.durability, 8);
    assert.equal(reward.detail.additional_info.wear_value, 0);
    assert.deepEqual(reward.init_params, {
      init_wear_value: { has_value: false, value: 0 },
      food_material_ids: [],
      recipe_id: 0,
    });
    assert.ok(!("init_durability" in reward.init_params));
  });
});

describe("buildAdminSendGlobalMailExecBody", () => {
  it("matches HAR AdminSendGlobalMail structure", () => {
    const body = buildAdminSendGlobalMailExecBody({
      envName: "sbt01",
      region: "SG",
      title: "标题",
      content: "内容",
      startTime: 1779253200,
      endTime: 1779274254,
      tradable: true,
      rewardItems: [{ id: "101038", cnt: "1" }],
      globalMailType: "GlobalMailType_ATTACHMENT",
      distType: "DistType_NONE",
      senderName: "lang",
      localization: [],
    });
    assert.equal(body.name, "AdminSendGlobalMail");
    const param = body.param as { env: string; command: Record<string, unknown> };
    assert.equal(param.env, "sbt01");
    assert.equal(param.command.region, "SG");
    assert.equal(param.command.global_mail_type, "GlobalMailType_ATTACHMENT");
    const attachment = param.command.attachment as { reward_items: { id: string; cnt: string }[] };
    assert.equal(attachment.reward_items[0]!.id, "101038");
    assert.equal(attachment.reward_items[0]!.cnt, "1");
    const init = attachment.reward_items[0] as { init_params: Record<string, unknown> };
    assert.deepEqual(init.init_params, {
      initWearValue: { hasValue: false, value: 0 },
      foodMaterialIds: [],
      recipeId: 0,
    });
    assert.ok(!("init_protect_value" in init.init_params));
    assert.ok(!("init_wear_value" in init.init_params));
    assert.ok(!("initDurability" in init.init_params));
  });

  it("sets initWearValue and wear_value when wearValue provided", () => {
    const body = buildAdminSendGlobalMailExecBody({
      envName: "sbt01",
      region: "SG",
      title: "标题",
      content: "内容",
      startTime: 1779253200,
      endTime: 1779274254,
      tradable: true,
      rewardItems: [{ id: "101038", cnt: "1", wearValue: 80 }],
      globalMailType: "GlobalMailType_ATTACHMENT",
      distType: "DistType_NONE",
      senderName: "lang",
      localization: [],
    });
    const attachment = (body.param as { command: { attachment: { reward_items: unknown[] } } }).command
      .attachment;
    const reward = attachment.reward_items[0] as {
      init_params: Record<string, unknown>;
      detail: { additional_info: Record<string, unknown> };
    };
    assert.deepEqual(reward.init_params, {
      initWearValue: { hasValue: true, value: 80 },
      foodMaterialIds: [],
      recipeId: 0,
    });
    assert.equal(reward.detail.additional_info.wear_value, 80);
  });

  it("sets durability in additional_info only for global mail durability items", () => {
    const body = buildAdminSendGlobalMailExecBody({
      envName: "sbt01",
      region: "SG",
      title: "标题",
      content: "内容",
      startTime: 1779253200,
      endTime: 1779274254,
      tradable: true,
      rewardItems: [{ id: "510015", cnt: "1", durabilityValue: 8 }],
      globalMailType: "GlobalMailType_ATTACHMENT",
      distType: "DistType_NONE",
      senderName: "lang",
      localization: [],
    });
    const attachment = (body.param as { command: { attachment: { reward_items: unknown[] } } }).command
      .attachment;
    const reward = attachment.reward_items[0] as {
      init_params: Record<string, unknown>;
      detail: { additional_info: Record<string, unknown> };
    };
    assert.equal(reward.detail.additional_info.durability, 8);
    assert.ok(!("initDurability" in reward.init_params));
  });
});

describe("buildAdminClearTimeoutMatchInfoExecBody", () => {
  it("matches HAR body for AdminClearTimeoutMatchInfo", () => {
    const body = buildAdminClearTimeoutMatchInfoExecBody({
      envName: "rct01",
      accountId: "10002125",
      lockRegion: "SG",
      notiRegion: "SG",
    });
    assert.equal(body.name, "AdminClearTimeoutMatchInfo");
    const param = body.param as {
      env: string;
      command: Record<string, string>;
    };
    assert.equal(param.env, "rct01");
    assert.equal(param.command.account_id, "10002125");
    assert.equal(param.command.lock_region, "SG");
    assert.equal(param.command.noti_region, "SG");
    assert.equal(param.command.task_id, undefined);
  });
});

describe("buildAddSproutScoreExecBody", () => {
  it("matches HAR body for AddSproutScore with one-click amount", () => {
    const body = buildAddSproutScoreExecBody({
      envName: "rct01",
      accountId: "10002125",
      lockRegion: "SG",
      notiRegion: "SG",
      sproutScore: SPROUT_SCORE_ONE_CLICK_AMOUNT,
    });
    assert.equal(body.name, "AddSproutScore");
    const param = body.param as {
      env: string;
      command: Record<string, string>;
    };
    assert.equal(param.env, "rct01");
    assert.equal(param.command.account_id, "10002125");
    assert.equal(param.command.lock_region, "SG");
    assert.equal(param.command.noti_region, "SG");
    assert.equal(param.command.sprout_score, "100000");
  });
});
