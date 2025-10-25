import csv
import io
from typing import List
from fastapi.responses import StreamingResponse
from app.schemas import PurchasePlanItem, MenuNudge
from app.models import Farm

def generate_purchase_order_csv(plan: List[PurchasePlanItem], farms: List[Farm]) -> StreamingResponse:
    """
    Generate purchase order CSV
    
    Args:
        plan: List of PurchasePlanItem objects
        farms: List of Farm objects for farm names
    
    Returns:
        StreamingResponse with CSV content
    """
    # Create farm lookup
    farm_lookup = {farm.id: farm for farm in farms}
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'farm_name', 'produce_sku', 'produce_name', 'qty_kg', 
        'landed_cost_per_kg', 'delivery_fee_alloc', 'line_total'
    ])
    
    # Write data rows
    for item in plan:
        farm = farm_lookup.get(item.farm_id)
        farm_name = farm.farm_name if farm else f"Farm {item.farm_id}"
        
        # Calculate delivery fee allocation (simplified)
        delivery_fee_alloc = item.landed_cost_per_kg - (item.landed_cost_per_kg * 0.9)  # Rough estimate
        
        writer.writerow([
            farm_name,
            item.produce_sku,
            item.produce_sku,  # Use SKU as name for now
            f"{item.qty_kg:.2f}",
            f"${item.landed_cost_per_kg:.2f}",
            f"${delivery_fee_alloc:.2f}",
            f"${item.total_cost:.2f}"
        ])
    
    # Prepare response
    output.seek(0)
    csv_content = output.getvalue()
    
    return StreamingResponse(
        io.BytesIO(csv_content.encode('utf-8')),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="purchase_order.csv"'}
    )

def generate_price_changes_csv(nudges: List[MenuNudge]) -> StreamingResponse:
    """
    Generate price changes CSV
    
    Args:
        nudges: List of MenuNudge objects
    
    Returns:
        StreamingResponse with CSV content
    """
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'menu_item_name', 'current_price', 'suggested_price', 
        'delta', 'reason'
    ])
    
    # Write data rows
    for nudge in nudges:
        writer.writerow([
            nudge.menu_item_name,
            f"${nudge.current_price:.2f}",
            f"${nudge.suggested_price:.2f}",
            f"${nudge.nudge_delta:+.2f}",
            nudge.why
        ])
    
    # Prepare response
    output.seek(0)
    csv_content = output.getvalue()
    
    return StreamingResponse(
        io.BytesIO(csv_content.encode('utf-8')),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="price_changes.csv"'}
    )

def create_csv_file(filename: str, content: str) -> str:
    """
    Create a CSV file on disk
    
    Args:
        filename: Name of the file
        content: CSV content
    
    Returns:
        Path to created file
    """
    import os
    
    # Create exports directory if it doesn't exist
    export_dir = "/data/exports"
    os.makedirs(export_dir, exist_ok=True)
    
    file_path = os.path.join(export_dir, filename)
    
    with open(file_path, 'w', newline='', encoding='utf-8') as f:
        f.write(content)
    
    return file_path
