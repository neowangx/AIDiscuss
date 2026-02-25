-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "frameworkId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'spectator',
    "status" TEXT NOT NULL DEFAULT 'created',
    "currentPhase" INTEGER NOT NULL DEFAULT 0,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discussion_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "Framework" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscussionRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discussionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "avatar" TEXT,
    "expertise" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "speakingStyle" TEXT NOT NULL,
    "principles" TEXT NOT NULL,
    "modelProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "modelId" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscussionRole_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discussionId" TEXT NOT NULL,
    "roleId" TEXT,
    "roundId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ai',
    "content" TEXT NOT NULL,
    "phase" INTEGER,
    "phaseName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "DiscussionRole" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discussionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "phaseName" TEXT,
    "phaseIndex" INTEGER,
    "instruction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Round_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Framework" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "phases" TEXT NOT NULL,
    "triggers" TEXT NOT NULL,
    "phaseCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "expertise" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "speakingStyle" TEXT NOT NULL,
    "principles" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "anthropicApiKey" TEXT,
    "openaiApiKey" TEXT,
    "defaultProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "defaultModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "autoPlaySpeed" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DiscussionRole_discussionId_idx" ON "DiscussionRole"("discussionId");

-- CreateIndex
CREATE INDEX "Message_discussionId_idx" ON "Message"("discussionId");

-- CreateIndex
CREATE INDEX "Message_roundId_idx" ON "Message"("roundId");

-- CreateIndex
CREATE INDEX "Round_discussionId_idx" ON "Round"("discussionId");

-- CreateIndex
CREATE UNIQUE INDEX "Framework_name_key" ON "Framework"("name");
