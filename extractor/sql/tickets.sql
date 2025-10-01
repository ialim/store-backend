SELECT TOP (@limit)
  cab.FO AS fo,
  cab.SERIE AS serie,
  cab.NUMERO AS ticketNumber,
  cab.N AS suffix,
  cab.FECHA AS issuedAt,
  ISNULL(rest.HORAINI, cab.HORA) AS openedAt,
  ISNULL(rest.HORAFIN, cab.HORA) AS closedAt,
  cab.TOTALNETO AS totalNet,
  cab.CODCLIENTE AS customerCode,
  cab.CODVENDEDOR AS vendorCode,
  cab.SERIE AS warehouseCode,
  cab.CAJA AS drawerCode,
  LinesJson = (
    SELECT
      lin.NUMLINEA AS lineNumber,
      lin.CODARTICULO AS articleCode,
      lin.TALLA AS sizeCode,
      lin.COLOR AS colorCode,
      lin.UNIDADES AS quantity,
      lin.PRECIO AS price,
      lin.PRECIOIVA AS priceVat,
      lin.UNIDADES * lin.PRECIO AS lineTotal,
      lin.CODVENDEDOR AS vendorCode
    FROM TICKETSLIN lin
    WHERE lin.FO = cab.FO
      AND lin.SERIE = cab.SERIE
      AND lin.NUMERO = cab.NUMERO
      AND lin.N = cab.N
    ORDER BY lin.NUMLINEA
    FOR JSON PATH
  ),
  CursorValue = CONCAT(
    FORMAT(cab.FECHA, 'yyyyMMddHHmmssfff'),
    '-',
    RIGHT('000000' + CAST(cab.NUMERO AS VARCHAR(6)), 6)
  )
FROM TICKETSCAB cab
LEFT JOIN TIQUETSCAB rest
  ON rest.FO = cab.FO
 AND rest.SERIE = cab.SERIE
 AND rest.NUMERO = cab.NUMERO
 AND rest.N = cab.N
WHERE cab.SERIE = @storeCode
  AND (
    @cursor IS NULL
    OR CONCAT(
      FORMAT(cab.FECHA, 'yyyyMMddHHmmssfff'),
      '-',
      RIGHT('000000' + CAST(cab.NUMERO AS VARCHAR(6)), 6)
    ) > @cursor
  )
ORDER BY CursorValue ASC;
