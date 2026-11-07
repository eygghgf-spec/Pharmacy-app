CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(80) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(80),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expensesLedger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(120) NOT NULL,
	`amountCents` int NOT NULL,
	`description` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expensesLedger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseInvoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(64) NOT NULL,
	`supplierId` int NOT NULL,
	`totalCents` int NOT NULL,
	`paidCents` int NOT NULL DEFAULT 0,
	`status` enum('paid','credit') NOT NULL DEFAULT 'paid',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchaseInvoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchaseInvoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `purchaseItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseId` int NOT NULL,
	`productId` int NOT NULL,
	`batchId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitCostCents` int NOT NULL,
	`totalCents` int NOT NULL,
	CONSTRAINT `purchaseItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returnItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`returnId` int NOT NULL,
	`saleItemId` int NOT NULL,
	`quantity` int NOT NULL,
	`totalCents` int NOT NULL,
	CONSTRAINT `returnItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returnsLedger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`returnNumber` varchar(64) NOT NULL,
	`saleId` int NOT NULL,
	`totalCents` int NOT NULL,
	`reason` varchar(255) NOT NULL,
	`restock` int NOT NULL DEFAULT 1,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `returnsLedger_id` PRIMARY KEY(`id`),
	CONSTRAINT `returnsLedger_returnNumber_unique` UNIQUE(`returnNumber`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`phone` varchar(40),
	`balanceCents` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
