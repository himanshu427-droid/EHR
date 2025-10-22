/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const assetTransfer = require('./lib/assetTransfer');
const TouristContract = require('./lib/tourist');
module.exports.AssetTransfer = assetTransfer;
module.exports.contracts = [assetTransfer];
module.exports.contracts = [TouristContract];
