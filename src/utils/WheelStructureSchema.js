/**
 * WheelStructureSchema.js
 * 
 * Zod schemas for validating wheelStructure data
 * Provides type-safe validation with clear error messages
 * 
 * Created: 2024-12-24
 */

import { z } from 'zod';

// Ring schema
export const RingSchema = z.object({
  id: z.string().uuid('Ring ID must be a valid UUID'),
  name: z.string().min(1, 'Ring name cannot be empty'),
  type: z.enum(['inner', 'outer'], {
    errorMap: () => ({ message: 'Ring type must be either "inner" or "outer"' })
  }),
  visible: z.boolean().default(true),
  orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (#RRGGBB)').optional(),
  ring_order: z.number().int().nonnegative().optional()
});

// Activity Group schema
export const ActivityGroupSchema = z.object({
  id: z.string().uuid('Activity group ID must be a valid UUID'),
  name: z.string().min(1, 'Activity group name cannot be empty'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (#RRGGBB)'),
  visible: z.boolean().default(true)
});

// Label schema
export const LabelSchema = z.object({
  id: z.string().uuid('Label ID must be a valid UUID'),
  name: z.string().min(1, 'Label name cannot be empty'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (#RRGGBB)'),
  visible: z.boolean().default(true)
});

// Item schema
export const ItemSchema = z.object({
  id: z.string().uuid('Item ID must be a valid UUID'),
  name: z.string().min(1, 'Item name cannot be empty'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  ringId: z.string().uuid('Ring ID must be a valid UUID'),
  activityId: z.string().uuid('Activity ID must be a valid UUID'),
  labelId: z.string().uuid().optional().nullable(),
  time: z.string().optional().nullable(),
  description: z.string().nullable().default(''),
  source: z.enum(['manual', 'google_calendar', 'google_sheets']).default('manual'),
  external_id: z.string().optional().nullable(),
  sync_metadata: z.record(z.any()).optional().nullable(),
  // Cross-year support
  crossYearGroupId: z.string().uuid().optional().nullable(),
  _originalStartDate: z.string().optional().nullable(),
  _originalEndDate: z.string().optional().nullable(),
  isCluster: z.boolean().optional().nullable()
}).refine(
  (data) => {
    // Validate that end date is not before start date
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  },
  {
    message: 'End date must be on or after start date',
    path: ['endDate']
  }
);

// Main WheelStructure schema
export const WheelStructureSchema = z.object({
  rings: z.array(RingSchema).default([]),
  activityGroups: z.array(ActivityGroupSchema).default([]),
  labels: z.array(LabelSchema).default([]),
  items: z.array(ItemSchema).default([])
}).superRefine((data, ctx) => {
  // Validate that items reference existing rings
  const ringIds = new Set(data.rings.map(r => r.id));
  const activityIds = new Set(data.activityGroups.map(a => a.id));
  
  data.items.forEach((item, index) => {
    if (!ringIds.has(item.ringId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Item "${item.name}" references non-existent ring: ${item.ringId}`,
        path: ['items', index, 'ringId']
      });
    }
    
    if (!activityIds.has(item.activityId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Item "${item.name}" references non-existent activity: ${item.activityId}`,
        path: ['items', index, 'activityId']
      });
    }
  });
});

// Legacy support: Schema that accepts 'activities' instead of 'activityGroups'
export const LegacyWheelStructureSchema = z.object({
  rings: z.array(RingSchema).default([]),
  activities: z.array(ActivityGroupSchema).default([]),
  labels: z.array(LabelSchema).default([]),
  items: z.array(ItemSchema).default([])
}).transform((data) => ({
  rings: data.rings,
  activityGroups: data.activities,
  labels: data.labels,
  items: data.items
}));

/**
 * Validate and parse wheelStructure data with Zod
 * @param {Object} data - Raw data to validate
 * @returns {{ success: boolean, data?: Object, errors?: Array }}
 */
export function validateWheelStructure(data) {
  try {
    // Try modern schema first
    const result = WheelStructureSchema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    // Try legacy schema (activities → activityGroups)
    const legacyResult = LegacyWheelStructureSchema.safeParse(data);
    if (legacyResult.success) {
      return { success: true, data: legacyResult.data };
    }
    
    // Both failed - return errors from modern schema
    return {
      success: false,
      errors: result.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))
    };
  } catch (error) {
    return {
      success: false,
      errors: [{ path: 'root', message: error.message }]
    };
  }
}

export default {
  RingSchema,
  ActivityGroupSchema,
  LabelSchema,
  ItemSchema,
  WheelStructureSchema,
  LegacyWheelStructureSchema,
  validateWheelStructure
};
