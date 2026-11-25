using CSMS.Dto.Inventory;

namespace CSMS.service.Inventory
{
    public interface IInventoryService
    {
        /// <summary>
        /// Upserts an inventory entry for the given branch+product.
        /// Returns (dto, created) where created=true means a new row was inserted.
        /// Returns null when the branch or product does not exist (→ 404).
        /// </summary>
        Task<(InventoryResponseDto Dto, bool Created)?> UpsertAsync(int branchId, InventoryAddRequestDto dto);

        /// <summary>
        /// Updates the quantity of an existing entry.
        /// Returns null when the entry is not found (→ 404).
        /// </summary>
        Task<InventoryResponseDto?> UpdateAsync(int branchId, int productId, InventoryUpdateRequestDto dto);

        /// <summary>
        /// Deletes an inventory entry.
        /// Returns null when not found (→ 404).
        /// Returns true on success (→ 204).
        /// </summary>
        Task<bool?> DeleteAsync(int branchId, int productId);
    }
}
