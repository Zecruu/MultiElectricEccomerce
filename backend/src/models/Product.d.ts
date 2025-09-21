import mongoose, { InferSchemaType } from 'mongoose';
declare const ProductSchema: mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    sku: string;
    price: number;
    status: "hidden" | "draft" | "active" | "out_of_stock";
    category: string;
    stock: number;
    featured: boolean;
    images: mongoose.Types.DocumentArray<{
        primary: boolean;
        url: string;
        alt?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        primary: boolean;
        url: string;
        alt?: string | null;
    }> & {
        primary: boolean;
        url: string;
        alt?: string | null;
    }>;
    lowStockThreshold?: number | null;
    translations?: {
        es: {
            name: string;
            description: string;
        };
        en: {
            name: string;
            description: string;
        };
    } | null;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    sku: string;
    price: number;
    status: "hidden" | "draft" | "active" | "out_of_stock";
    category: string;
    stock: number;
    featured: boolean;
    images: mongoose.Types.DocumentArray<{
        primary: boolean;
        url: string;
        alt?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        primary: boolean;
        url: string;
        alt?: string | null;
    }> & {
        primary: boolean;
        url: string;
        alt?: string | null;
    }>;
    lowStockThreshold?: number | null;
    translations?: {
        es: {
            name: string;
            description: string;
        };
        en: {
            name: string;
            description: string;
        };
    } | null;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
}>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    sku: string;
    price: number;
    status: "hidden" | "draft" | "active" | "out_of_stock";
    category: string;
    stock: number;
    featured: boolean;
    images: mongoose.Types.DocumentArray<{
        primary: boolean;
        url: string;
        alt?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        primary: boolean;
        url: string;
        alt?: string | null;
    }> & {
        primary: boolean;
        url: string;
        alt?: string | null;
    }>;
    lowStockThreshold?: number | null;
    translations?: {
        es: {
            name: string;
            description: string;
        };
        en: {
            name: string;
            description: string;
        };
    } | null;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
    _id: any;
};
export declare const Product: mongoose.Model<any, {}, {}, {}, any, any> | mongoose.Model<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    sku: string;
    price: number;
    status: "hidden" | "draft" | "active" | "out_of_stock";
    category: string;
    stock: number;
    featured: boolean;
    images: mongoose.Types.DocumentArray<{
        primary: boolean;
        url: string;
        alt?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        primary: boolean;
        url: string;
        alt?: string | null;
    }> & {
        primary: boolean;
        url: string;
        alt?: string | null;
    }>;
    lowStockThreshold?: number | null;
    translations?: {
        es: {
            name: string;
            description: string;
        };
        en: {
            name: string;
            description: string;
        };
    } | null;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    sku: string;
    price: number;
    status: "hidden" | "draft" | "active" | "out_of_stock";
    category: string;
    stock: number;
    featured: boolean;
    images: mongoose.Types.DocumentArray<{
        primary: boolean;
        url: string;
        alt?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        primary: boolean;
        url: string;
        alt?: string | null;
    }> & {
        primary: boolean;
        url: string;
        alt?: string | null;
    }>;
    lowStockThreshold?: number | null;
    translations?: {
        es: {
            name: string;
            description: string;
        };
        en: {
            name: string;
            description: string;
        };
    } | null;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
}, {}, {
    timestamps: true;
}> & {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    sku: string;
    price: number;
    status: "hidden" | "draft" | "active" | "out_of_stock";
    category: string;
    stock: number;
    featured: boolean;
    images: mongoose.Types.DocumentArray<{
        primary: boolean;
        url: string;
        alt?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        primary: boolean;
        url: string;
        alt?: string | null;
    }> & {
        primary: boolean;
        url: string;
        alt?: string | null;
    }>;
    lowStockThreshold?: number | null;
    translations?: {
        es: {
            name: string;
            description: string;
        };
        en: {
            name: string;
            description: string;
        };
    } | null;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    sku: string;
    price: number;
    status: "hidden" | "draft" | "active" | "out_of_stock";
    category: string;
    stock: number;
    featured: boolean;
    images: mongoose.Types.DocumentArray<{
        primary: boolean;
        url: string;
        alt?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        primary: boolean;
        url: string;
        alt?: string | null;
    }> & {
        primary: boolean;
        url: string;
        alt?: string | null;
    }>;
    lowStockThreshold?: number | null;
    translations?: {
        es: {
            name: string;
            description: string;
        };
        en: {
            name: string;
            description: string;
        };
    } | null;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    sku: string;
    price: number;
    status: "hidden" | "draft" | "active" | "out_of_stock";
    category: string;
    stock: number;
    featured: boolean;
    images: mongoose.Types.DocumentArray<{
        primary: boolean;
        url: string;
        alt?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        primary: boolean;
        url: string;
        alt?: string | null;
    }> & {
        primary: boolean;
        url: string;
        alt?: string | null;
    }>;
    lowStockThreshold?: number | null;
    translations?: {
        es: {
            name: string;
            description: string;
        };
        en: {
            name: string;
            description: string;
        };
    } | null;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
}>, {}, mongoose.ResolveSchemaOptions<{
    timestamps: true;
}>> & mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    sku: string;
    price: number;
    status: "hidden" | "draft" | "active" | "out_of_stock";
    category: string;
    stock: number;
    featured: boolean;
    images: mongoose.Types.DocumentArray<{
        primary: boolean;
        url: string;
        alt?: string | null;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        primary: boolean;
        url: string;
        alt?: string | null;
    }> & {
        primary: boolean;
        url: string;
        alt?: string | null;
    }>;
    lowStockThreshold?: number | null;
    translations?: {
        es: {
            name: string;
            description: string;
        };
        en: {
            name: string;
            description: string;
        };
    } | null;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export {};
//# sourceMappingURL=Product.d.ts.map