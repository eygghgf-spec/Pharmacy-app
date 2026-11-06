CREATE TABLE `batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`batchNumber` varchar(80) NOT NULL,
	`expiryDate` varchar(10) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`purchasePriceCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(120) NOT NULL,
	`amountCents` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barcode` varchar(64),
	`name` varchar(255) NOT NULL,
	`category` varchar(120) NOT NULL,
	`salePriceCents` int NOT NULL,
	`purchasePriceCents` int NOT NULL,
	`minimumStock` int NOT NULL DEFAULT 0,
	`requiresPrescription` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_barcode_unique` UNIQUE(`barcode`)
);
--> statement-breakpoint
CREATE TABLE `saleItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`batchId` int,
	`quantity` int NOT NULL,
	`unitPriceCents` int NOT NULL,
	`totalCents` int NOT NULL,
	CONSTRAINT `saleItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(64) NOT NULL,
	`customerName` varchar(160) NOT NULL DEFAULT 'عميل نقدي',
	`totalCents` int NOT NULL,
	`paymentMethod` enum('cash','card','credit') NOT NULL DEFAULT 'cash',
	`status` enum('paid','credit','refunded') NOT NULL DEFAULT 'paid',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
