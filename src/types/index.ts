import { Subscription } from "@prisma/client";
import {
	Organization as BaseOrganization,
	Member as BaseMember,
} from "better-auth/plugins";

export interface User {
	role?: string;
	id: string;
	createdAt: Date;
	updatedAt: Date;
	email: string;
	emailVerified: boolean;
	name: string;
	image?: string | null | undefined;
}

export interface MemberUser {
	email: string;
	name: string;
	image?: string;
}

export interface Member extends BaseMember {
	user: MemberUser;
}
export interface Organization extends BaseOrganization {
	subscription?: Subscription;
}

// export interface Subscription {
// 	id: string;
// 	organizationId: string;
// 	status: string;
// 	amount: number;
// 	currency: string;
// 	recurringInterval: string;
// 	currentPeriodStart: string;
// 	currentPeriodEnd: string;
// 	cancelAtPeriodEnd: boolean;
// 	canceledAt?: string;
// 	startedAt: string;
// 	endsAt?: string;
// 	endedAt?: string;
// 	customerId: string;
// 	productId: string;
// 	discountId?: string;
// 	checkoutId: string;
// 	customerCancellationReason?: string;
// 	customerCancellationComment?: string;
// 	metadata?: string;
// 	customFieldData?: string;
// 	createdAt: string;
// 	modifiedAt?: string;
// }
