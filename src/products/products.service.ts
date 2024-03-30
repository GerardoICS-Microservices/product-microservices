import { Injectable, OnModuleInit, Logger, HttpStatus } from '@nestjs/common';

import { PrismaClient } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;
    const totalPages = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(totalPages / limit);
    const products = await this.product.findMany({
      where: { available: true },
      take: limit,
      skip: (page - 1) * limit,
    });

    console.log('products', products);

    return {
      data: products,
      meta: {
        page: page,
        total: totalPages,
        lastPage: lastPage,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: { id, available: true },
    });

    if (!product) {
      throw new RpcException({
        message: `Product with id #${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: __, ...data } = updateProductDto;
    await this.findOne(id);

    return this.product.update({
      where: { id, available: true },
      data: data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    // return this.product.delete({
    //   where: { id },
    // });

    return await this.product.update({
      where: { id },
      data: { available: false },
    });
  }

  async validateProducts(ids: number[]) {
    //make sure to purge duplicated ids
    const uniqueIds = [...new Set(ids)];

    const products = await this.product.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
      },
    });

    //validate and throw error if any product is not found
    if (products.length !== uniqueIds.length) {
      const foundIds = products.map((product) => product.id);
      const notFoundIds = uniqueIds.filter((id) => !foundIds.includes(id));

      throw new RpcException({
        message: `Products with ids ${notFoundIds.join(', ')} not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return products;
  }
}
