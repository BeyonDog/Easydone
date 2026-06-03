function defaultRewardItemDetailAdditionalInfo(): Record<string, unknown> {
  return {
    owner_nickname: "",
    durability: 0,
    dead_reason: 0,
    killer_name: "",
    killer_class_id: 0,
    killer_weapon_id: 0,
    killer_monster_id: 0,
    match_mode: "MatchMode_NONE",
    game_mode: "GameMode_NONE",
    map_mode: "MapMode_NONE",
    wear_value: 0,
    food_material_ids: [],
    recipe_id: 0,
  };
}

function defaultInitParams(): Record<string, unknown> {
  return {
    init_wear_value: { has_value: false, value: 0 },
    food_material_ids: [],
    recipe_id: 0,
  };
}

/** AdminSendMail reward_items 单条默认骨架（与 GMT HAR 一致，仅 id/cnt/tradable 由业务填写） */
export function defaultRewardItem(id: string, cnt: string, tradable: boolean): Record<string, unknown> {
  return {
    id,
    inst_id: 0,
    cnt,
    item_loc: "ItemLocation_NONE",
    class_id: 0,
    cell_index: 0,
    expire_at: 0,
    tradable,
    item_status: "ItemStatus_NONE",
    item_type: "ItemType_NONE",
    item_sub_type: "ItemSubType_NONE",
    detail: {
      basic_attrs: [],
      additional_info: defaultRewardItemDetailAdditionalInfo(),
    },
    gear_score: 0,
    season_id: 0,
    duration_sec: 0,
    init_params: defaultInitParams(),
  };
}

function defaultMailAdditionalInfo(): Record<string, unknown> {
  return {
    match_start_time: 0,
    teammate_nickname: "",
    return_items: [],
    level_group_id: 0,
    expire_items: [],
    reported_account_id: 0,
    reported_nickname: "",
    game_violation: "GameViolation_UNKNOWN",
    prohibits: [],
    reduce_coins: 0,
    friend_gift_sender_id: 0,
    friend_gift_sender_name: "",
  };
}

function defaultCtxFields(): Record<string, unknown> {
  return {
    account_id: 0,
    open_id: "",
    open_id_type: 0,
    user_id: 0,
    region: "",
    ip_region: "",
    device_id: "",
    main_open_id_type: 0,
  };
}

export const GMT_COMMAND_ADMIN_SEND_MAIL = "AdminSendMail";

export type AdminSendMailBuildInput = {
  envName: string;
  accountId: string;
  lockRegion: string;
  notiRegion: string;
  tradable: boolean;
  rewardItems: { id: string; cnt: string }[];
};

export const GMT_COMMAND_ADMIN_FINISH_TASK = "AdminFinishTask";

export type AdminFinishTaskBuildInput = {
  envName: string;
  accountId: string;
  lockRegion: string;
  notiRegion: string;
  taskId: string;
};

export const GMT_COMMAND_ADMIN_ADD_EXP = "AdminAddExp";

export type AdminAddExpBuildInput = {
  envName: string;
  accountId: string;
  exp: string;
  lockRegion: string;
  notiRegion: string;
};

export function buildAdminAddExpExecBody(input: AdminAddExpBuildInput): Record<string, unknown> {
  return {
    name: GMT_COMMAND_ADMIN_ADD_EXP,
    param: {
      env: input.envName,
      command: {
        account_id: input.accountId,
        exp: input.exp,
        lock_region: input.lockRegion,
        noti_region: input.notiRegion,
      },
    },
  };
}

export function buildAdminFinishTaskExecBody(input: AdminFinishTaskBuildInput): Record<string, unknown> {
  return {
    name: GMT_COMMAND_ADMIN_FINISH_TASK,
    param: {
      env: input.envName,
      command: {
        account_id: input.accountId,
        lock_region: input.lockRegion,
        noti_region: input.notiRegion,
        task_id: input.taskId,
      },
    },
  };
}

export const GMT_COMMAND_ADMIN_SEND_GLOBAL_MAIL = "AdminSendGlobalMail";

function defaultGlobalMailInitParams(): Record<string, unknown> {
  return {
    initWearValue: { hasValue: false, value: 0 },
    foodMaterialIds: [],
    recipeId: 0,
  };
}

/** 全服邮件 attachment.reward_items 单条（proto JSON：init_params 用 camelCase） */
export function defaultGlobalMailRewardItem(id: string, cnt: string, tradable: boolean): Record<string, unknown> {
  const row = defaultRewardItem(id, cnt, tradable);
  return {
    ...row,
    init_params: defaultGlobalMailInitParams(),
  };
}

export type AdminSendGlobalMailBuildInput = {
  envName: string;
  region: string;
  title: string;
  content: string;
  startTime: number;
  endTime: number;
  tradable: boolean;
  rewardItems: { id: string; cnt: string }[];
  globalMailType: string;
  distType: string;
  senderName: string;
  localization: unknown;
};

export function buildAdminSendGlobalMailExecBody(input: AdminSendGlobalMailBuildInput): Record<string, unknown> {
  const reward_items = input.rewardItems.map((r) =>
    defaultGlobalMailRewardItem(r.id, r.cnt, input.tradable),
  );
  return {
    name: GMT_COMMAND_ADMIN_SEND_GLOBAL_MAIL,
    param: {
      env: input.envName,
      command: {
        region: input.region,
        title: input.title,
        content: input.content,
        attachment: {
          reward_items,
          claimed_item_cnts: [],
        },
        sender_name: input.senderName,
        start_time: input.startTime,
        end_time: input.endTime,
        localization: input.localization,
        global_mail_type: input.globalMailType,
        dist_type: input.distType,
      },
    },
  };
}

export function buildAdminSendMailExecBody(input: AdminSendMailBuildInput): Record<string, unknown> {
  const reward_items = input.rewardItems.map((r) =>
    defaultRewardItem(r.id, r.cnt, input.tradable),
  );
  return {
    name: GMT_COMMAND_ADMIN_SEND_MAIL,
    param: {
      env: input.envName,
      command: {
        account_id: input.accountId,
        lock_region: input.lockRegion,
        noti_region: input.notiRegion,
        mail_info: [
          {
            mail_id: 0,
            template_id: 0,
            title: "",
            content: "",
            sender_name: "",
            attachment: {
              reward_items,
              claimed_item_cnts: [],
            },
            receive_time: 0,
            expire_time: 0,
            source: "Source_GAME",
            status: "Status_NONE",
            additional_info: defaultMailAdditionalInfo(),
          },
        ],
        ctx_fields: defaultCtxFields(),
      },
    },
  };
}
