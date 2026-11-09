CREATE TABLE `customerPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`amountCents` int NOT NULL,
	`note` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`phone` varchar(40),
	`balanceCents` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseReturnItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`returnId` int NOT NULL,
	`purchaseItemId` int NOT NULL,
	`batchId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitCostCents` int NOT NULL,
	`totalCents` int NOT NULL,
	CONSTRAINT `purchaseReturnItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseReturns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`returnNumber` varchar(64) NOT NULL,
	`supplierId` int NOT NULL,
	`totalCents` int NOT NULL,
	`reason` varchar(255) NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchaseReturns_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchaseReturns_returnNumber_unique` UNIQUE(`returnNumber`)
);
--> statement-breakpoint
CREATE TABLE `supplierPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`amountCents` int NOT NULL,
	`note` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplierPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sales` ADD `customerId` int;