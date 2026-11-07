CREATE TABLE `syncOperations` (
	`operationId` varchar(128) NOT NULL,
	`operationType` varchar(64) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syncOperations_operationId` PRIMARY KEY(`operationId`)
);
