CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"person" text NOT NULL,
	"occasion" text NOT NULL,
	"date" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
