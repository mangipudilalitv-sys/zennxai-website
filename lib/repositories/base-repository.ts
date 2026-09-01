import {
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  supabaseServer,
} from "@/app/lib/supabase-server";

export abstract class BaseRepository {
  protected readonly db: SupabaseClient;

  constructor() {
    this.db = supabaseServer;
  }

  protected table(name: string) {
    return this.db.from(name);
  }

  protected rpc(
    fn: string,
    args?: Record<string, unknown>,
  ) {
    return this.db.rpc(fn, args);
  }
}
