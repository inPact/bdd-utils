## 1.2.2
* fix lodash-4 breaking-changes usages

## 1.2.1
* fix @tabit/utils reference

## 1.2.0
* 'verifySetIncludes' with 'saveLinks' option now saves links on context in 'savedLinks' property
* bdd-utils now includes default entity-resolver for resolving saved links using "link" or "LINK" resolver-headers,
e.g., \[link](A)._id
* migrated to lodash-4 
* migrate to new @tabit/utils
* migrate to @tabit/utils 'sumSafe' implementation instead of broken lodash-4 'sum'
* 'format': 'mergeHeadless' option no longer treats zeros as headless
* 'format': added 'excludeEmpty' option to ignore empty cells (rather than all "falsey" values)

## 1.1.0
* Utility functions and moredash now exported along with bdd-utils
* migrated entity-resolvers into bdd-utils
