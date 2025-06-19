const mongoose = require('mongoose');
const tenantContext = require('../../utils/tenantContext');

function tenantScopePlugin(schema, options) {
  // 1. Add tenantId to the schema
  schema.add({
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
  });

  // 2. Automatically add tenantId to new documents
  schema.pre('validate', function (next) {
    const store = tenantContext.getStore();

    if (this.isNew) {
      if (store && store.tenantId) {
        this.tenantId = store.tenantId;
      } else if (!this.tenantId) {
        return next(new Error('Tenant context is missing or does not contain a tenantId.'));
      }
    }
    next();
  });

  // 3. Automatically filter queries by tenantId
  const tenantQueryMiddleware = function (next) {
    const store = tenantContext.getStore();
    if (store && store.tenantId) {
      this.where({ tenantId: store.tenantId });
    }
    next();
  };

  const queryHooks = [
    'find',
    'findOne',
    'countDocuments',
    'findOneAndUpdate',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
  ];

  queryHooks.forEach(hook => {
    schema.pre(hook, tenantQueryMiddleware);
  });
}

module.exports = tenantScopePlugin;
