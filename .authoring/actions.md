# Action reference, generated

Generated from `packages/common/src/actions/` in the mg.js repository. Do not edit by hand: run
`npm run gen:actions`. The form column is which of the three outbound shapes the action must use:
`flat`, `wrapped` or `room`.

71 wire actions, 72 methods.

## session

| Method | Wire | Form | Parameters |
|---|---|---|---|
| `ping` | `Ping` | flat | id?: number |
| `voteForGame` | `VoteForGame` | room | gameName?: string |
| `setSelectedGame` | `SetSelectedGame` | room | gameName?: string |
| `restartGame` | `RestartGame` | room | gameName?: string |
| `checkWeatherStatus` | `CheckWeatherStatus` | flat | (none) |

- `ping`: Answered with a matching Pong. Structurally different from a command, and never expected to move into the envelope.
- `voteForGame`: Send on open, before SetSelectedGame.
- `setSelectedGame`: Field is `gameName` here too; don't confuse it with RestartGame's `name`.
- `restartGame`: Uses `name`, unlike VoteForGame/SetSelectedGame which use `gameName`.
- `checkWeatherStatus`: Nudges the server to (re)confirm current weather.

## social

| Method | Wire | Form | Parameters |
|---|---|---|---|
| `chat` | `Chat` | room | message: string |
| `emote` | `Emote` | room | emoteType: string |
| `wish` | `Wish` | wrapped | itemId?: string |
| `kickPlayer` | `KickPlayer` | room | targetPlayerId: string |
| `setPlayerData` | `SetPlayerData` | room | name?: string, cosmetic?: unknown |
| `usurpHost` | `UsurpHost` | room | (none) |
| `markChatRead` | `MarkChatRead` | room | seq: number |

- `wish`: Throws a coin in the wishing well. Omit itemId for an untargeted wish; do not send null.
- `kickPlayer`: Host-only, enforced server-side.
- `setPlayerData`: Include only the field(s) you're changing.
- `markChatRead`: Implies the chat log is sequence-indexed.

## movement

| Method | Wire | Form | Parameters |
|---|---|---|---|
| `move` | `PlayerPosition` | flat | x: number, y: number |
| `teleport` | `Teleport` | flat | x: number, y: number |

- `move`: Sent continuously to broadcast movement. Feeds a continuous snapshot channel rather than a discrete sequenced action, so it is never expected to move into the envelope.
- `teleport`: Instant position set, tile-grid coordinates.

## shop

| Method | Wire | Form | Parameters |
|---|---|---|---|
| `purchaseShopItem` | `PurchaseShopItem` | wrapped | shop: ShopKey, item: { itemType: string } & Record<string, unknown> |

- `purchaseShopItem`: Replaces older per-category purchase messages.

## garden

| Method | Wire | Form | Parameters |
|---|---|---|---|
| `plantSeed` | `PlantSeed` | wrapped | slot: number, species: string |
| `waterPlant` | `WaterPlant` | wrapped | slot: number |
| `harvestCrop` | `HarvestCrop` | wrapped | slot: number, slotsIndex?: number, cropItemId?: string |
| `sellAllCrops` | `SellAllCrops` | wrapped | (none) |
| `plantGardenPlant` | `PlantGardenPlant` | wrapped | slot: number, itemId: string |
| `potPlant` | `PotPlant` | wrapped | slot: number, plantItemId?: string |
| `mutationPotion` | `MutationPotion` | wrapped | tileObjectIdx: number, growSlotIdx: number, mutation: string |
| `cropCleanser` | `CropCleanser` | wrapped | tileObjectIdx: number, growSlotIdx: number |
| `placeCrystal` | `PlaceCrystal` | wrapped | shard: CrystalShard, tileType: string, localTileIndex: number |
| `fuseCrystal` | `PlaceCrystal` | wrapped | mergeGainSeconds: number |
| `pickupCrystal` | `PickupCrystal` | wrapped | crystalType: string, tileType: string, localTileIndex: number, itemId?: string |
| `removeGardenObject` | `RemoveGardenObject` | wrapped | slot: number, slotType: string |
| `preserve` | `Preserve` | wrapped | itemId: string, growSlotIdx: number |
| `displayCrop` | `DisplayCrop` | wrapped | tileType: string, localTileIndex: number, itemId: string |
| `pickupDisplayedCrop` | `PickupDisplayedCrop` | wrapped | tileType: string, localTileIndex: number |

- `harvestCrop`: slotsIndex is the crop to harvest (its own slotId) and is required by the bundle schema. cropItemId is a client-minted UUID and is required; mint it, do not wait for one. The resulting item arrives in the next inventory patch (a RoomFrame since v756; PartialState before that); there is no synchronous response.
- `plantGardenPlant`: Plants a potted plant already in inventory back into the ground.
- `potPlant`: Client mints the id so it can reference the pot immediately without waiting for the state patch.
- `cropCleanser`: Strips mutations from a crop.
- `placeCrystal`, `fuseCrystal`: Also used to fuse a shard into an existing crystal, with intent {type:"merge", mergeGainSeconds}. There is no separate fuse wire command.
- `pickupCrystal`: Keeps the crystal's remaining time. itemId is client-minted.
- `preserve`: Turns a harvested crop into a preserve.

## decor

| Method | Wire | Form | Parameters |
|---|---|---|---|
| `placeDecor` | `PlaceDecor` | wrapped | decorId: string, tileType: string, localTileIndex: number, rotation?: number |
| `pickupDecor` | `PickupDecor` | wrapped | tileType: string, localTileIndex: number |

- `placeDecor`: Omit rotation for the default orientation.

## pets

| Method | Wire | Form | Parameters |
|---|---|---|---|
| `placePet` | `PlacePet` | wrapped | itemId: string, x: number, y: number, tileType: string, localTileIndex: number |
| `pickupPet` | `PickupPet` | wrapped | petId: string |
| `feedPet` | `FeedPet` | wrapped | petItemId: string, cropItemId: string |
| `useReplenishPotion` | `ReplenishPotion` | wrapped | petItemId: string |
| `sellPet` | `SellPet` | wrapped | itemId: string |
| `ridePet` | `RidePet` | wrapped | petItemId: string |
| `dismountPet` | `DismountPet` | wrapped | (none) |
| `dawnCapture` | `DawnCapture` | wrapped | petItemId: string, x: number, y: number |
| `thundercharge` | `Thundercharge` | wrapped | petItemId: string, x: number, y: number |
| `xpPotion` | `XPPotion` | wrapped | petItemId: string |
| `requestPetGreet` | `RequestPetGreet` | flat | x: number, y: number |
| `equipPetCosmetic` | `EquipPetCosmetic` | wrapped | petItemId: string, slotCategory: string, cosmeticId: string |
| `namePet` | `NamePet` | wrapped | petItemId: string, name: string |
| `swapPet` | `SwapPet` | wrapped | petSlotId: string, petInventoryId: string |
| `swapPetFromStorage` | `SwapPetFromStorage` | wrapped | petSlotId: string, storagePetId: string, storageId: string |
| `movePetSlot` | `MovePetSlot` | wrapped | movePetSlotId: string, toPetSlotIndex: number |
| `growEgg` | `GrowEgg` | wrapped | slot: number, eggId: string |
| `hatchEgg` | `HatchEgg` | wrapped | slot: number |
| `upgradePetHutch` | `UpgradePetHutch` | flat | (none) |
| `savePetTeam` | `SavePetTeam` | wrapped | teamId: string, name: string, petIds: string[], isCreate: boolean |
| `applyPetTeam` | `ApplyPetTeam` | wrapped | teamId: string |
| `deletePetTeam` | `DeletePetTeam` | wrapped | teamId: string |
| `movePetTeam` | `MovePetTeam` | wrapped | movePetTeamId: string, toPetTeamIndex: number |
| `setPetTeamEmblem` | `SetPetTeamEmblem` | wrapped | teamId: string, emblem: PetTeamEmblem |

- `useReplenishPotion`: Fully restores hunger. Must be standing on the pet's tile; use Teleport first if needed.
- `ridePet`: Required before any rideable ability (DawnCapture, Thundercharge).
- `dawnCapture`: Requires riding the pet and being off cooldown.
- `thundercharge`: Same preconditions as DawnCapture.
- `savePetTeam`: isCreate distinguishes a new team from an edit of an existing teamId.
- `setPetTeamEmblem`: Send the emblem as an object, never a bare string; a string is silently dropped by the game's own reducer.

## inventory

| Method | Wire | Form | Parameters |
|---|---|---|---|
| `moveInventoryItem` | `MoveInventoryItem` | wrapped | moveItemId: string, toInventoryIndex: number |
| `setSelectedItem` | `SetSelectedItem` | flat | itemIndex: number |
| `toggleLockItem` | `ToggleLockItem` | wrapped | itemId: string |
| `dropObject` | `DropObject` | flat | (none) |
| `pickupObject` | `PickupObject` | flat | (none) |
| `putItemInStorage` | `PutItemInStorage` | wrapped | itemId: string, storageId: string, toStorageIndex?: number, quantity?: number |
| `retrieveItemFromStorage` | `RetrieveItemFromStorage` | wrapped | itemId: string, storageId: string, toInventoryIndex?: number, quantity?: number |
| `moveStorageItem` | `MoveStorageItem` | wrapped | itemId: string, storageId: string, toStorageIndex: number |
| `swapItemWithStorage` | `SwapItemWithStorage` | wrapped | storageId: string, inventoryItemId: string, storageItemId: string, toStorageIndex?: number, toInventoryIndex?: number, draggedQuantity?: number, draggedFromInventory?: boolean |
| `logItems` | `LogItems` | wrapped | (none) |
| `upgradeSeedSilo` | `UpgradeSeedSilo` | flat | (none) |
| `upgradeDecorShed` | `UpgradeDecorShed` | flat | (none) |
| `upgradeToolShack` | `UpgradeToolShack` | flat | (none) |
| `throwSnowball` | `ThrowSnowball` | flat | (none) |
| `checkFriendBonus` | `CheckFriendBonus` | flat | (none) |
| `quinoaTutorialSkipped` | `QuinoaTutorialSkipped` | flat | (none) |

- `dropObject`: Acts on whatever's currently held/stood-on; sending any params gets it rejected as malformed.
- `pickupObject`: Same as DropObject: sending any params gets it rejected as malformed.
- `putItemInStorage`: Omit toStorageIndex to append at the end; omit quantity to move the whole stack.
- `swapItemWithStorage`: One atomic exchange rather than a retrieve+put pair; keeps both capacities unchanged mid-swap. Only send draggedQuantity/draggedFromInventory together.
- `throwSnowball`: Seasonal.

## Parameter interfaces

The exact type of every params object the table above refers to, with each optional field marked

### PingParams

- `id?: number`

### RestartGameParams

- `gameName?: string`

### GameNameParams

- `gameName?: string`

### ChatParams

- `message: string`

### EmoteParams

- `emoteType: string`

### WishParams

- `itemId?: string`

### KickPlayerParams

- `targetPlayerId: string`

### SetPlayerDataParams

- `name?: string`
- `cosmetic?: unknown`

### MarkChatReadParams

- `seq: number`

### MoveParams

- `x: number`
- `y: number`

### PurchaseShopItemParams

- `shop: ShopKey`
- `item: { itemType: string } & Record<string, unknown>`

### PlantSeedParams

- `slot: number`
- `species: string`

### SlotParams

- `slot: number`

### HarvestCropParams

- `slot: number`
- `slotsIndex?: number`
- `cropItemId?: string`

### PlantGardenPlantParams

- `slot: number`
- `itemId: string`

### PotPlantParams

- `slot: number`
- `plantItemId?: string`

### MutationPotionParams

- `tileObjectIdx: number`
- `growSlotIdx: number`
- `mutation: string`

### GrowSlotParams

- `tileObjectIdx: number`
- `growSlotIdx: number`

### PlaceCrystalParams

- `shard: CrystalShard`
- `tileType: string`
- `localTileIndex: number`

### FuseCrystalParams

- `mergeGainSeconds: number`

### PickupCrystalParams

- `crystalType: string`
- `tileType: string`
- `localTileIndex: number`
- `itemId?: string`

### RemoveGardenObjectParams

- `slot: number`
- `slotType: string`

### PreserveParams

- `itemId: string`
- `growSlotIdx: number`

### DisplayCropParams

- `tileType: string`
- `localTileIndex: number`
- `itemId: string`

### LocalTileParams

- `tileType: string`
- `localTileIndex: number`

### PlaceDecorParams

- `decorId: string`
- `tileType: string`
- `localTileIndex: number`
- `rotation?: number`

### PlacePetParams

- `itemId: string`
- `x: number`
- `y: number`
- `tileType: string`
- `localTileIndex: number`

### PickupPetParams

- `petId: string`

### FeedPetParams

- `petItemId: string`
- `cropItemId: string`

### PetItemParams

- `petItemId: string`

### SellPetParams

- `itemId: string`

### PetAbilityParams

- `petItemId: string`
- `x: number`
- `y: number`

### RequestPetGreetParams

- `x: number`
- `y: number`

### EquipPetCosmeticParams

- `petItemId: string`
- `slotCategory: string`
- `cosmeticId: string`

### NamePetParams

- `petItemId: string`
- `name: string`

### SwapPetParams

- `petSlotId: string`
- `petInventoryId: string`

### SwapPetFromStorageParams

- `petSlotId: string`
- `storagePetId: string`
- `storageId: string`

### MovePetSlotParams

- `movePetSlotId: string`
- `toPetSlotIndex: number`

### GrowEggParams

- `slot: number`
- `eggId: string`

### SavePetTeamParams

- `teamId: string`
- `name: string`
- `petIds: string[]`
- `isCreate: boolean`

### TeamIdParams

- `teamId: string`

### MovePetTeamParams

- `movePetTeamId: string`
- `toPetTeamIndex: number`

### SetPetTeamEmblemParams

- `teamId: string`
- `emblem: PetTeamEmblem`

### MoveInventoryItemParams

- `moveItemId: string`
- `toInventoryIndex: number`

### SetSelectedItemParams

- `itemIndex: number`

### ToggleLockItemParams

- `itemId: string`

### PutItemInStorageParams

- `itemId: string`
- `storageId: string`
- `toStorageIndex?: number`
- `quantity?: number`

### RetrieveItemFromStorageParams

- `itemId: string`
- `storageId: string`
- `toInventoryIndex?: number`
- `quantity?: number`

### MoveStorageItemParams

- `itemId: string`
- `storageId: string`
- `toStorageIndex: number`

### SwapItemWithStorageParams

- `storageId: string`
- `inventoryItemId: string`
- `storageItemId: string`
- `toStorageIndex?: number`
- `toInventoryIndex?: number`
- `draggedQuantity?: number`
- `draggedFromInventory?: boolean`

