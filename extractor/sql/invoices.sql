SELECT TOP (@limit)
  fv.NUMSERIE AS serie,
  fv.NUMFACTURA AS invoiceNumber,
  fv.N AS suffix,
  fv.FECHA AS issuedAt,
  fv.TOTALNETO AS totalNet,
  fv.CODCLIENTE AS customerCode,
  fv.CODVENDEDOR AS vendorCode,
  fv.CODALMACEN AS warehouseCode,
  LinesJson = (
    SELECT
      fl.NUMLINEA AS lineNumber,
      fl.CODARTICULO AS articleCode,
      fl.TALLA AS sizeCode,
      fl.COLOR AS colorCode,
      fl.UNIDADES AS quantity,
      fl.PRECIO AS price,
      fl.PRECIOIVA AS priceVat,
      fl.TOTAL AS lineTotal
    FROM FACTURASVENTALIN fl
    WHERE fl.NUMSERIE = fv.NUMSERIE
      AND fl.NUMFACTURA = fv.NUMFACTURA
      AND fl.N = fv.N
    ORDER BY fl.NUMLINEA
    FOR JSON PATH
  ),
  CursorValue = CONCAT(
    FORMAT(fv.FECHA, 'yyyyMMddHHmmssfff'),
    '-',
    RIGHT('000000' + CAST(fv.NUMFACTURA AS VARCHAR(6)), 6)
  )
FROM FACTURASVENTA fv
WHERE fv.CODALMACEN = @storeCode
  AND (
    @cursor IS NULL
    OR CONCAT(
      FORMAT(fv.FECHA, 'yyyyMMddHHmmssfff'),
      '-',
      RIGHT('000000' + CAST(fv.NUMFACTURA AS VARCHAR(6)), 6)
    ) > @cursor
  )
ORDER BY CursorValue ASC;
