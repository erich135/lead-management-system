import pandas as pd
import openpyxl
import os

try:
    # Read the Excel file
    file_path = 'JOB BOOK JHB LIVE.xlsx'
    
    print('=== CLIENT EXCEL FILE ANALYSIS ===')
    
    # Get sheet names first
    xl_file = pd.ExcelFile(file_path)
    print('Sheet names:')
    for i, sheet in enumerate(xl_file.sheet_names):
        print(f'  {i+1}. {sheet}')
    print()
    
    # Analyze the main sheet (likely first one)
    main_sheet = xl_file.sheet_names[0]
    print(f'=== ANALYZING MAIN SHEET: {main_sheet} ===')
    
    df = pd.read_excel(file_path, sheet_name=main_sheet, nrows=100)
    print(f'Total dimensions: {len(df)} rows x {len(df.columns)} columns')
    print()
    
    print('Column Structure:')
    for i, col in enumerate(df.columns):
        col_name = str(col).strip()
        if col_name and col_name != 'nan' and not col_name.startswith('Unnamed'):
            # Count non-empty values in this column
            non_empty = df[col].dropna().count()
            print(f'  {i+1:2d}. {col_name:<40} ({non_empty} entries)')
    print()
    
    # Find rows with actual data (skip headers/empty rows)
    data_rows = df.dropna(how='all')
    if len(data_rows) > 0:
        print('Sample Lead Data (first 3 actual records):')
        count = 0
        for idx, row in data_rows.iterrows():
            if count >= 3:
                break
            has_data = False
            row_info = []
            
            for col in df.columns:
                value = row[col]
                if pd.notna(value) and str(value).strip() and str(value) != 'nan':
                    has_data = True
                    row_info.append(f'{str(col)[:25]}: {str(value)[:40]}')
            
            if has_data and len(row_info) > 2:  # Only show rows with meaningful data
                print(f'\n  Lead {count + 1}:')
                for info in row_info[:10]:  # Show first 10 fields
                    print(f'    {info}')
                count += 1
    
    print('\n' + '='*60)
    
    # Try to identify key workflow fields
    print('WORKFLOW ANALYSIS:')
    
    # Look for status/stage columns
    status_cols = []
    date_cols = []
    contact_cols = []
    value_cols = []
    
    for col in df.columns:
        col_lower = str(col).lower()
        if any(word in col_lower for word in ['status', 'stage', 'phase', 'step', 'progress']):
            status_cols.append(col)
        elif any(word in col_lower for word in ['date', 'time', 'created', 'updated']):
            date_cols.append(col)
        elif any(word in col_lower for word in ['contact', 'client', 'customer', 'name', 'company']):
            contact_cols.append(col)
        elif any(word in col_lower for word in ['value', 'amount', 'price', 'cost', 'quote', 'r']):
            value_cols.append(col)
    
    if status_cols:
        print(f'Status/Workflow columns: {status_cols}')
    if date_cols:
        print(f'Date columns: {date_cols}')
    if contact_cols:
        print(f'Contact/Client columns: {contact_cols}')
    if value_cols:
        print(f'Value/Financial columns: {value_cols}')
    
    # Analyze status values if found
    if status_cols:
        main_status_col = status_cols[0]
        status_values = df[main_status_col].dropna().unique()
        print(f'\nUnique status values in "{main_status_col}":')
        for status in status_values[:20]:  # Show first 20
            if str(status) != 'nan':
                print(f'  - {status}')
    
    # Look for all sheets to understand full workflow
    print('\n' + '='*60)
    print('ALL SHEETS ANALYSIS:')
    
    for sheet_name in xl_file.sheet_names:
        try:
            sheet_df = pd.read_excel(file_path, sheet_name=sheet_name, nrows=10)
            non_empty_cols = []
            for col in sheet_df.columns:
                if not str(col).startswith('Unnamed') and sheet_df[col].dropna().count() > 0:
                    non_empty_cols.append(str(col)[:30])
            
            print(f'\nSheet "{sheet_name}":')
            print(f'  Columns with data: {non_empty_cols[:8]}')  # First 8 columns
            
        except Exception as e:
            print(f'  Error reading sheet {sheet_name}: {e}')

except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()