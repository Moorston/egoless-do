/**
 * 全球脉动数据库迁移
 * 创建 global_checkins 和 global_stats 集合
 * 适配 PocketBase 0.22.0
 */

migrate((app) => {
  const dao = app.dao();

  // 创建 global_checkins 集合
  const checkinsCollection = new Collection({
    name: "global_checkins",
    type: "base",
    system: false,
    schema: [
      {
        name: "checkin_id",
        type: "text",
        required: true,
        unique: true,
        options: {
          min: 1,
          max: 36
        }
      },
      {
        name: "user_hash",
        type: "text",
        required: true,
        unique: false,
        options: {
          min: 8,
          max: 64
        }
      },
      {
        name: "lat",
        type: "number",
        required: true,
        unique: false,
        options: {
          min: -90,
          max: 90
        }
      },
      {
        name: "lng",
        type: "number",
        required: true,
        unique: false,
        options: {
          min: -180,
          max: 180
        }
      },
      {
        name: "type",
        type: "select",
        required: true,
        unique: false,
        options: {
          values: ["exercise", "fasting", "meditation"]
        }
      },
      {
        name: "streak",
        type: "number",
        required: true,
        unique: false,
        options: {
          min: 0,
          max: 99999
        }
      },
      {
        name: "total_days",
        type: "number",
        required: true,
        unique: false,
        options: {
          min: 0,
          max: 99999
        }
      },
      {
        name: "created_at",
        type: "date",
        required: true,
        unique: false
      },
      {
        name: "opted_out",
        type: "bool",
        required: false,
        unique: false
      }
    ],
    indexes: [
      "CREATE INDEX idx_global_checkins_user_hash ON global_checkins (user_hash)",
      "CREATE INDEX idx_global_checkins_created_at ON global_checkins (created_at)",
      "CREATE INDEX idx_global_checkins_type ON global_checkins (type)",
      "CREATE INDEX idx_global_checkins_lat_lng ON global_checkins (lat, lng)"
    ],
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != '' && user_hash = @request.auth.id",
    deleteRule: "@request.auth.id != '' && user_hash = @request.auth.id"
  });

  dao.saveCollection(checkinsCollection);

  // 创建 global_stats 集合
  const statsCollection = new Collection({
    name: "global_stats",
    type: "base",
    system: false,
    schema: [
      {
        name: "total_users",
        type: "number",
        required: true,
        unique: false,
        options: {
          min: 0
        }
      },
      {
        name: "active_today",
        type: "number",
        required: true,
        unique: false,
        options: {
          min: 0
        }
      },
      {
        name: "top_streak",
        type: "number",
        required: true,
        unique: false,
        options: {
          min: 0
        }
      },
      {
        name: "countries",
        type: "number",
        required: true,
        unique: false,
        options: {
          min: 0
        }
      },
      {
        name: "updated_at",
        type: "date",
        required: true,
        unique: false
      }
    ],
    indexes: [],
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: null
  });

  dao.saveCollection(statsCollection);

  // 初始化统计数据
  const statsRecord = new Record(statsCollection, {
    total_users: 0,
    active_today: 0,
    top_streak: 0,
    countries: 0,
    updated_at: new Date().toISOString()
  });
  dao.saveRecord(statsRecord);
});

// 回滚函数
migrate((app) => {
  const dao = app.dao();

  try {
    const checkinsCollection = dao.findCollectionByNameOrId("global_checkins");
    dao.deleteCollection(checkinsCollection);
  } catch (e) {
    // 集合不存在，忽略
  }

  try {
    const statsCollection = dao.findCollectionByNameOrId("global_stats");
    dao.deleteCollection(statsCollection);
  } catch (e) {
    // 集合不存在，忽略
  }
});
