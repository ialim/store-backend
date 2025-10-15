-- AddForeignKey
ALTER TABLE "public"."SaleOrder" ADD CONSTRAINT "SaleOrder_billerId_fkey" FOREIGN KEY ("billerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
