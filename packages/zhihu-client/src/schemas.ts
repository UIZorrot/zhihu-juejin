import { type Static, Type } from "@sinclair/typebox";

export const ZhihuSearchItemSchema = Type.Object({
  Title: Type.String(),
  ContentType: Type.String(),
  ContentID: Type.String(),
  ContentText: Type.String(),
  Url: Type.String(),
  CommentCount: Type.Integer({ minimum: 0 }),
  VoteUpCount: Type.Integer({ minimum: 0 }),
  AuthorName: Type.String(),
  AuthorAvatar: Type.String(),
  AuthorBadge: Type.Optional(Type.String()),
  AuthorBadgeText: Type.Optional(Type.String()),
  EditTime: Type.Integer({ minimum: 0 }),
  AuthorityLevel: Type.Optional(Type.String()),
  RankingScore: Type.Optional(Type.Number()),
  CommentInfoList: Type.Optional(
    Type.Array(
      Type.Object({
        Content: Type.String(),
      }),
    ),
  ),
});

export type ZhihuSearchItem = Static<typeof ZhihuSearchItemSchema>;

export const ZhihuSearchResponseSchema = Type.Object({
  Code: Type.Integer(),
  Message: Type.String(),
  Data: Type.Object({
    HasMore: Type.Boolean(),
    Items: Type.Array(ZhihuSearchItemSchema),
  }),
});

export type ZhihuSearchResponse = Static<typeof ZhihuSearchResponseSchema>;
